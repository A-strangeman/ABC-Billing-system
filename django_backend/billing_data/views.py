from datetime import datetime
from decimal import Decimal

from django.utils import timezone
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.auth_utils import get_authenticated_user
from config.cache_utils import cached_response, get_user_cached_payload, invalidate_user_cache, query_string_suffix, set_user_cached_payload
from .models import Bill, BillItem


def auth_or_401(request):
	user = get_authenticated_user(request)
	if not user:
		return None, Response({'success': False, 'error': 'Authentication required. No token provided.'}, status=401)
	return user, None


def parse_decimal(value, default=0):
	if value in (None, ''):
		return Decimal(str(default))
	try:
		return Decimal(str(value))
	except Exception:
		return Decimal(str(default))


def parse_date(value):
	if not value:
		return datetime.utcnow().date()
	if isinstance(value, str):
		try:
			return datetime.strptime(value[:10], '%Y-%m-%d').date()
		except ValueError:
			return datetime.utcnow().date()
	return value


def item_payload(item):
	return {
		'productName': item.product_name,
		'qty': float(item.qty),
		'unit': item.unit,
		'price': float(item.price),
		'amount': float(item.amount),
		'isPly': item.is_ply,
		'height': float(item.height) if item.height is not None else None,
		'width': float(item.width) if item.width is not None else None,
		'pieces': item.pieces,
	}


def bill_payload(bill):
	return {
		'_id': str(bill.id),
		'estimateNo': bill.estimate_no,
		'date': bill.date.isoformat() if bill.date else None,
		'customer': {
			'name': bill.customer_name,
			'phone': bill.customer_phone,
		},
		'items': [item_payload(item) for item in bill.items.all().order_by('id')],
		'subTotal': float(bill.sub_total),
		'discountPercent': float(bill.discount_percent),
		'discount': float(bill.discount),
		'total': float(bill.total),
		'received': float(bill.received),
		'balance': float(bill.balance),
		'deleted': bill.deleted,
		'deletedAt': bill.deleted_at.isoformat() if bill.deleted_at else None,
		'createdAt': bill.created_at.isoformat() if bill.created_at else None,
		'updatedAt': bill.updated_at.isoformat() if bill.updated_at else None,
	}


def upsert_bill_items(bill, items):
	bill.items.all().delete()
	for item in items or []:
		BillItem.objects.create(
			bill=bill,
			product_name=item.get('productName', ''),
			qty=parse_decimal(item.get('qty'), 0),
			unit=item.get('unit', ''),
			price=parse_decimal(item.get('price'), 0),
			amount=parse_decimal(item.get('amount'), 0),
			is_ply=bool(item.get('isPly', False)),
			height=parse_decimal(item.get('height')) if item.get('height') not in (None, '') else None,
			width=parse_decimal(item.get('width')) if item.get('width') not in (None, '') else None,
			pieces=item.get('pieces') if item.get('pieces') not in ('', None) else None,
		)


@api_view(['GET'])
def next_invoice_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'bills.next_invoice')
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	last_bill = Bill.objects.filter(owner=user, deleted=False).order_by('-estimate_no').only('estimate_no').first()
	next_number = last_bill.estimate_no + 1 if last_bill else 1
	payload = {'nextInvoiceNo': next_number}
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET', 'POST'])
def bills_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	if request.method == 'POST':
		estimate_no = request.data.get('estimateNo')
		if estimate_no is None:
			return Response({'error': 'estimateNo is required'}, status=400)

		try:
			estimate_no = int(estimate_no)
		except (TypeError, ValueError):
			return Response({'error': 'estimateNo must be a number'}, status=400)

		if estimate_no <= 0:
			return Response({'error': 'estimateNo must be greater than zero'}, status=400)

		exists = Bill.objects.filter(owner=user, estimate_no=estimate_no, deleted=False).exists()
		if exists:
			return Response({'error': 'Invoice number already exists'}, status=400)

		customer = request.data.get('customer') or {}
		bill = Bill.objects.create(
			owner=user,
			estimate_no=estimate_no,
			date=parse_date(request.data.get('date')),
			customer_name=(customer.get('name') or ''),
			customer_phone=(customer.get('phone') or ''),
			sub_total=parse_decimal(request.data.get('subTotal'), 0),
			discount_percent=parse_decimal(request.data.get('discountPercent'), 0),
			discount=parse_decimal(request.data.get('discount'), 0),
			total=parse_decimal(request.data.get('total'), 0),
			received=parse_decimal(request.data.get('received'), 0),
			balance=parse_decimal(request.data.get('balance'), 0),
			deleted=False,
		)
		upsert_bill_items(bill, request.data.get('items') or [])
		bill.refresh_from_db()
		invalidate_user_cache(user.id)
		return Response({'message': 'Bill saved', 'bill': bill_payload(bill)}, status=201)

	cached_payload, cache_key = get_user_cached_payload(user.id, 'bills.list', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	page = int(request.query_params.get('page') or 1)
	limit = int(request.query_params.get('limit') or 20)
	if page < 1:
		page = 1
	if limit < 1:
		limit = 20

	queryset = Bill.objects.filter(owner=user, deleted=False).order_by('-created_at')
	total = queryset.count()
	start = (page - 1) * limit
	end = start + limit
	bills = queryset[start:end].prefetch_related('items')

	payload = {
		'bills': [bill_payload(bill) for bill in bills],
		'total': total,
		'page': page,
		'pages': (total + limit - 1) // limit,
	}
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET'])
def price_history_view(request, product_name):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'bills.price_history', suffix=str(product_name or ''))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	history_rows = (
		BillItem.objects.filter(bill__owner=user, bill__deleted=False, product_name=product_name)
		.select_related('bill')
		.order_by('-bill__created_at')[:50]
	)

	price_history = []
	seen = set()
	for row in history_rows:
		key = str(row.price)
		if key in seen:
			continue
		seen.add(key)
		price_history.append(
			{
				'price': float(row.price),
				'unit': row.unit,
				'date': row.bill.created_at.isoformat() if row.bill.created_at else None,
			}
		)
		if len(price_history) >= 5:
			break

	set_user_cached_payload(cache_key, price_history, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(price_history, hit=False)


@api_view(['GET', 'PUT', 'DELETE'])
def bill_detail_view(request, item_id):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	bill = Bill.objects.filter(pk=item_id, owner=user, deleted=False).prefetch_related('items').first()
	if not bill:
		return Response({'message': 'Bill not found'}, status=404)

	if request.method == 'GET':
		return Response(bill_payload(bill))

	if request.method == 'PUT':
		customer = request.data.get('customer') or {}
		if 'estimateNo' in request.data:
			try:
				new_estimate_no = int(request.data.get('estimateNo'))
			except (TypeError, ValueError):
				return Response({'error': 'estimateNo must be a number'}, status=400)

			if new_estimate_no <= 0:
				return Response({'error': 'estimateNo must be greater than zero'}, status=400)

			duplicate = Bill.objects.filter(owner=user, estimate_no=new_estimate_no, deleted=False).exclude(pk=bill.id).exists()
			if duplicate:
				return Response({'error': 'Invoice number already exists'}, status=400)

			bill.estimate_no = new_estimate_no
		if 'date' in request.data:
			bill.date = parse_date(request.data.get('date'))
		if isinstance(customer, dict):
			if 'name' in customer:
				bill.customer_name = customer.get('name') or ''
			if 'phone' in customer:
				bill.customer_phone = customer.get('phone') or ''

		if 'subTotal' in request.data:
			bill.sub_total = parse_decimal(request.data.get('subTotal'), 0)
		if 'discountPercent' in request.data:
			bill.discount_percent = parse_decimal(request.data.get('discountPercent'), 0)
		if 'discount' in request.data:
			bill.discount = parse_decimal(request.data.get('discount'), 0)
		if 'total' in request.data:
			bill.total = parse_decimal(request.data.get('total'), 0)
		if 'received' in request.data:
			bill.received = parse_decimal(request.data.get('received'), 0)
		if 'balance' in request.data:
			bill.balance = parse_decimal(request.data.get('balance'), 0)

		bill.save()
		if 'items' in request.data:
			upsert_bill_items(bill, request.data.get('items') or [])
		bill.refresh_from_db()
		invalidate_user_cache(user.id)
		return Response({'message': 'Bill updated', 'bill': bill_payload(bill)})

	bill.deleted = True
	bill.deleted_at = timezone.now()
	bill.save(update_fields=['deleted', 'deleted_at', 'updated_at'])
	invalidate_user_cache(user.id)

	return Response(
		{
			'success': True,
			'message': 'Bill deleted successfully',
			'billId': str(bill.id),
			'estimateNo': bill.estimate_no,
		}
	)
