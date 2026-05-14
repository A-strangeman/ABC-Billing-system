from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings

from accounts.auth_utils import get_authenticated_user
from config.cache_utils import cached_response, get_user_cached_payload, invalidate_user_cache, query_string_suffix, set_user_cached_payload
from .models import Customer


def auth_or_401(request):
	user = get_authenticated_user(request)
	if not user:
		return None, Response({'success': False, 'error': 'Authentication required. No token provided.'}, status=401)
	return user, None


def customer_payload(customer):
	return {
		'_id': str(customer.id),
		'name': customer.name,
		'phone': customer.phone,
		'address': customer.address,
		'createdAt': customer.created_at.isoformat() if customer.created_at else None,
		'updatedAt': customer.updated_at.isoformat() if customer.updated_at else None,
	}


@api_view(['GET'])
def search_customers_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'customers.search', suffix=query_string_suffix(request))
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	query = (request.query_params.get('q') or '').strip()
	if not query:
		return Response([])

	customers = Customer.objects.filter(owner=user, name__icontains=query).order_by('name')[:10]
	payload = [customer_payload(customer) for customer in customers]
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['GET', 'POST'])
def customers_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	if request.method == 'GET':
		cached_payload, cache_key = get_user_cached_payload(user.id, 'customers.list')
		if cached_payload is not None:
			return cached_response(cached_payload, hit=True)

		customers = Customer.objects.filter(owner=user).order_by('name')
		payload = [customer_payload(customer) for customer in customers]
		set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
		return cached_response(payload, hit=False)

	name = (request.data.get('name') or '').strip()
	phone = (request.data.get('phone') or '').strip()
	address = (request.data.get('address') or '').strip()

	if not name:
		return Response({'error': 'Name is required'}, status=400)

	customer = Customer.objects.create(owner=user, name=name, phone=phone, address=address)
	invalidate_user_cache(user.id)
	return Response(customer_payload(customer), status=201)


@api_view(['PUT'])
def customer_detail_view(request, item_id):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	customer = Customer.objects.filter(pk=item_id, owner=user).first()
	if not customer:
		return Response({'message': 'Customer not found'}, status=404)

	if 'name' in request.data:
		customer.name = str(request.data.get('name') or '').strip()
	if 'phone' in request.data:
		customer.phone = str(request.data.get('phone') or '').strip()
	if 'address' in request.data:
		customer.address = str(request.data.get('address') or '').strip()

	if not customer.name:
		return Response({'error': 'Name is required'}, status=400)

	customer.save(update_fields=['name', 'phone', 'address', 'updated_at'])
	invalidate_user_cache(user.id)
	return Response(customer_payload(customer))
