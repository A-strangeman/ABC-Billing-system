from datetime import datetime
from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.auth_utils import get_authenticated_user
from billing_data.models import Bill, BillItem
from config.cache_utils import cached_response, get_user_cached_payload, query_string_suffix, set_user_cached_payload


def auth_or_401(request):
	user = get_authenticated_user(request)
	if not user:
		return None, Response({'success': False, 'error': 'Authentication required. No token provided.'}, status=401)
	return user, None


def parse_date(value):
	if not value:
		return None
	try:
		return datetime.strptime(value[:10], '%Y-%m-%d').date()
	except ValueError:
		return None


def report_queryset(user, date_from=None, date_to=None):
	qs = Bill.objects.filter(owner=user, deleted=False)
	if date_from:
		qs = qs.filter(date__gte=date_from)
	if date_to:
		qs = qs.filter(date__lte=date_to)
	return qs


def bill_row_payload(bill):
	return {
		'_id': str(bill.id),
		'estimateNo': bill.estimate_no,
		'date': bill.date.isoformat() if bill.date else None,
		'customer': {
			'name': bill.customer_name,
			'phone': bill.customer_phone,
		},
		'subTotal': float(bill.sub_total),
		'discount': float(bill.discount),
		'total': float(bill.total),
		'balance': float(bill.balance),
		'itemCount': getattr(bill, 'item_count', 0),
	}


@api_view(['GET'])
def reports_root_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.root', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('from'))
	date_to = parse_date(request.query_params.get('to'))
	period = (request.query_params.get('period') or '').strip()

	if period and not (date_from or date_to):
		today = datetime.utcnow().date()
		if period == 'today':
			date_from = today
		elif period == 'week':
			date_from = today.fromordinal(today.toordinal() - 7)
		elif period == 'month':
			date_from = today.replace(day=1)
		elif period == 'year':
			date_from = today.replace(month=1, day=1)

	bills_qs = report_queryset(user, date_from, date_to)
	summary = _summary_from_queryset(bills_qs)

	recent_bills = list(
		bills_qs.annotate(item_count=Count('items')).order_by('-date', '-created_at')[:50]
	)

	product_rows = (
		BillItem.objects.filter(bill__in=bills_qs)
		.values('product_name')
		.annotate(qty=Coalesce(Sum('qty'), Decimal('0')), revenue=Coalesce(Sum('amount'), Decimal('0')))
		.order_by('-revenue')[:5]
	)

	payload = {
		'metrics': {
			**summary,
			'totalProfit': 0,
		},
		'bills': [bill_row_payload(bill) for bill in recent_bills],
		'topProducts': [
			{
				'name': row['product_name'],
				'qty': float(row['qty'] or 0),
				'revenue': float(row['revenue'] or 0),
			}
			for row in product_rows
		],
	}
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


def _summary_from_queryset(bills_qs):
	aggregated = bills_qs.aggregate(
		totalBills=Count('id'),
		totalRevenue=Coalesce(Sum('total'), Decimal('0')),
		totalDiscount=Coalesce(Sum('discount'), Decimal('0')),
		totalBalance=Coalesce(Sum('balance'), Decimal('0')),
		avgBill=Coalesce(Avg('total'), Decimal('0')),
		uniqueCustomers=Count('customer_name', distinct=True),
	)
	return {
		'totalBills': aggregated['totalBills'] or 0,
		'totalRevenue': float(aggregated['totalRevenue'] or 0),
		'totalDiscount': float(aggregated['totalDiscount'] or 0),
		'totalBalance': float(aggregated['totalBalance'] or 0),
		'avgBill': float(aggregated['avgBill'] or 0),
		'uniqueCustomers': aggregated['uniqueCustomers'] or 0,
	}


@api_view(['GET'])
def summary_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.summary', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('dateFrom'))
	date_to = parse_date(request.query_params.get('dateTo'))
	bills_qs = report_queryset(user, date_from, date_to)
	payload = _summary_from_queryset(bills_qs)
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET'])
def revenue_trend_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.revenue_trend', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('dateFrom'))
	date_to = parse_date(request.query_params.get('dateTo'))
	rows = (
		report_queryset(user, date_from, date_to)
		.values('date')
		.annotate(revenue=Coalesce(Sum('total'), Decimal('0')), billCount=Count('id'))
		.order_by('date')
	)

	payload = [
		{
			'date': row['date'].isoformat() if row['date'] else None,
			'revenue': float(row['revenue'] or 0),
			'billCount': row['billCount'] or 0,
		}
		for row in rows
	]
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET'])
def top_customers_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.top_customers', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('dateFrom'))
	date_to = parse_date(request.query_params.get('dateTo'))
	limit = int(request.query_params.get('limit') or 10)

	rows = (
		report_queryset(user, date_from, date_to)
		.values('customer_name')
		.annotate(
			totalRevenue=Coalesce(Sum('total'), Decimal('0')),
			billCount=Count('id'),
			pendingBalance=Coalesce(Sum('balance'), Decimal('0')),
			avgBill=Coalesce(Avg('total'), Decimal('0')),
		)
		.order_by('-totalRevenue')[:limit]
	)

	payload = [
		{
			'customerName': row['customer_name'] or '-',
			'totalRevenue': float(row['totalRevenue'] or 0),
			'billCount': row['billCount'] or 0,
			'pendingBalance': float(row['pendingBalance'] or 0),
			'avgBill': float(row['avgBill'] or 0),
		}
		for row in rows
	]
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET'])
def top_products_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.top_products', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('dateFrom'))
	date_to = parse_date(request.query_params.get('dateTo'))
	limit = int(request.query_params.get('limit') or 10)

	rows = (
		BillItem.objects.filter(bill__in=report_queryset(user, date_from, date_to))
		.values('product_name')
		.annotate(
			totalQuantity=Coalesce(Sum('qty'), Decimal('0')),
			totalAmount=Coalesce(Sum('amount'), Decimal('0')),
			occurrences=Count('id'),
		)
		.order_by('-totalAmount')[:limit]
	)

	payload = [
		{
			'productName': row['product_name'] or '-',
			'totalQuantity': float(row['totalQuantity'] or 0),
			'totalAmount': float(row['totalAmount'] or 0),
			'occurrences': row['occurrences'] or 0,
		}
		for row in rows
	]
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET'])
def payment_status_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.payment_status', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('dateFrom'))
	date_to = parse_date(request.query_params.get('dateTo'))
	qs = report_queryset(user, date_from, date_to)

	fully_paid = qs.filter(balance=0).aggregate(total=Coalesce(Sum('total'), Decimal('0')))['total']
	partially_paid = qs.filter(balance__gt=0).filter(balance__lt=F('total')).aggregate(total=Coalesce(Sum('total'), Decimal('0')))['total']
	unpaid = qs.filter(balance__gte=F('total')).aggregate(total=Coalesce(Sum('total'), Decimal('0')))['total']

	payload = {
		'fullyPaid': float(fully_paid or 0),
		'partiallyPaid': float(partially_paid or 0),
		'unpaid': float(unpaid or 0),
	}
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET'])
def recent_bills_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'reports.recent_bills', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	date_from = parse_date(request.query_params.get('dateFrom'))
	date_to = parse_date(request.query_params.get('dateTo'))
	page = int(request.query_params.get('page') or 1)
	limit = int(request.query_params.get('limit') or 20)

	if page < 1:
		page = 1
	if limit < 1:
		limit = 20

	qs = report_queryset(user, date_from, date_to).annotate(item_count=Count('items')).order_by('-date', '-created_at')
	start = (page - 1) * limit
	end = start + limit

	bills = list(qs[start:end])
	payload = [bill_row_payload(bill) for bill in bills]
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)
