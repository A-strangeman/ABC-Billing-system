from django.core.cache import cache
from rest_framework.response import Response


def _version_key(user_id):
	return f'ucv:{user_id}'


def get_user_cache_version(user_id):
	key = _version_key(user_id)
	value = cache.get(key)
	if value is None:
		cache.set(key, 1, timeout=None)
		return 1
	try:
		return int(value)
	except (TypeError, ValueError):
		cache.set(key, 1, timeout=None)
		return 1


def build_user_cache_key(user_id, namespace, suffix=''):
	version = get_user_cache_version(user_id)
	base = f'u:{user_id}:v:{version}:{namespace}'
	return f'{base}:{suffix}' if suffix else base


def get_user_cached_payload(user_id, namespace, suffix=''):
	key = build_user_cache_key(user_id, namespace, suffix=suffix)
	return cache.get(key), key


def set_user_cached_payload(cache_key, payload, timeout=300):
	cache.set(cache_key, payload, timeout=timeout)


def invalidate_user_cache(user_id):
	key = _version_key(user_id)
	try:
		cache.incr(key)
	except ValueError:
		cache.set(key, 2, timeout=None)
	except Exception:
		current = cache.get(key)
		try:
			next_value = int(current) + 1
		except (TypeError, ValueError):
			next_value = 2
		cache.set(key, next_value, timeout=None)


def query_string_suffix(request):
	return (request.META.get('QUERY_STRING') or '').strip()


def cached_response(payload, hit=False):
	response = Response(payload)
	response['X-Cache'] = 'HIT' if hit else 'MISS'
	return response