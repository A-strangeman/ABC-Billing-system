from datetime import datetime
from decimal import Decimal

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.auth_utils import get_authenticated_user
from config.cache_utils import cached_response, get_user_cached_payload, invalidate_user_cache, set_user_cached_payload
from .models import Draft, DraftItem


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
		return None
	if isinstance(value, str):
		try:
			return datetime.strptime(value[:10], '%Y-%m-%d').date()
		except ValueError:
			return None
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


def draft_payload(draft):
	return {
		'_id': str(draft.id),
		'estimateNo': draft.estimate_no,
		'date': draft.date.isoformat() if draft.date else None,
		'customer': {
			'name': draft.customer_name,
			'phone': draft.customer_phone,
		},
		'items': [item_payload(item) for item in draft.items.all().order_by('id')],
		'subTotal': float(draft.sub_total),
		'discountPercent': float(draft.discount_percent),
		'discount': float(draft.discount),
		'total': float(draft.total),
		'received': float(draft.received),
		'balance': float(draft.balance),
		'createdAt': draft.created_at.isoformat() if draft.created_at else None,
		'updatedAt': draft.updated_at.isoformat() if draft.updated_at else None,
	}


def upsert_draft_items(draft, items):
	draft.items.all().delete()
	for item in items or []:
		DraftItem.objects.create(
			draft=draft,
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


@api_view(['GET', 'POST'])
def drafts_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	if request.method == 'GET':
		cached_payload, cache_key = get_user_cached_payload(user.id, 'drafts.list')
		if cached_payload is not None:
			return cached_response(cached_payload, hit=True)

		drafts = Draft.objects.filter(owner=user).order_by('-created_at').prefetch_related('items')
		payload = [draft_payload(draft) for draft in drafts]
		set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
		return cached_response(payload, hit=False)

	customer = request.data.get('customer') or {}
	draft = Draft.objects.create(
		owner=user,
		estimate_no=request.data.get('estimateNo'),
		date=parse_date(request.data.get('date')),
		customer_name=customer.get('name') or '',
		customer_phone=customer.get('phone') or '',
		sub_total=parse_decimal(request.data.get('subTotal'), 0),
		discount_percent=parse_decimal(request.data.get('discountPercent'), 0),
		discount=parse_decimal(request.data.get('discount'), 0),
		total=parse_decimal(request.data.get('total'), 0),
		received=parse_decimal(request.data.get('received'), 0),
		balance=parse_decimal(request.data.get('balance'), 0),
	)
	upsert_draft_items(draft, request.data.get('items') or [])
	invalidate_user_cache(user.id)
	return Response({'success': True, 'draftId': str(draft.id), 'message': 'Draft saved'})


@api_view(['GET', 'PUT', 'DELETE'])
def draft_detail_view(request, item_id):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	draft = Draft.objects.filter(pk=item_id, owner=user).prefetch_related('items').first()
	if not draft:
		return Response({'error': 'Draft not found'}, status=404)

	if request.method == 'GET':
		return Response(draft_payload(draft))

	if request.method == 'PUT':
		customer = request.data.get('customer') or {}
		if 'estimateNo' in request.data:
			draft.estimate_no = request.data.get('estimateNo')
		if 'date' in request.data:
			draft.date = parse_date(request.data.get('date'))
		if isinstance(customer, dict):
			if 'name' in customer:
				draft.customer_name = customer.get('name') or ''
			if 'phone' in customer:
				draft.customer_phone = customer.get('phone') or ''

		if 'subTotal' in request.data:
			draft.sub_total = parse_decimal(request.data.get('subTotal'), 0)
		if 'discountPercent' in request.data:
			draft.discount_percent = parse_decimal(request.data.get('discountPercent'), 0)
		if 'discount' in request.data:
			draft.discount = parse_decimal(request.data.get('discount'), 0)
		if 'total' in request.data:
			draft.total = parse_decimal(request.data.get('total'), 0)
		if 'received' in request.data:
			draft.received = parse_decimal(request.data.get('received'), 0)
		if 'balance' in request.data:
			draft.balance = parse_decimal(request.data.get('balance'), 0)

		draft.save()
		if 'items' in request.data:
			upsert_draft_items(draft, request.data.get('items') or [])
		invalidate_user_cache(user.id)
		return Response({'success': True, 'draftId': str(draft.id), 'message': 'Draft updated'})

	draft.delete()
	invalidate_user_cache(user.id)
	return Response({'message': 'Draft deleted'})
