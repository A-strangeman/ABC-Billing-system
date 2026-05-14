from decimal import Decimal, InvalidOperation

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings

from accounts.auth_utils import get_authenticated_user
from config.cache_utils import cached_response, get_user_cached_payload, invalidate_user_cache, set_user_cached_payload
from .default_catalog import seed_default_catalog_for_user
from .models import Category, Fitting, Material, Size


def parse_price_input(value):
	if value in (None, ''):
		return None
	try:
		return Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError):
		return None


def auth_or_401(request):
	user = get_authenticated_user(request)
	if not user:
		return None, Response({'success': False, 'error': 'Authentication required. No token provided.'}, status=401)
	return user, None


def category_payload(category):
	return {
		'_id': str(category.id),
		'name': category.name,
		'active': category.active,
	}


def material_payload(material):
	return {
		'_id': str(material.id),
		'name': material.name,
		'categoryId': str(material.category_id),
		'buyingPrice': float(material.buying_price) if material.buying_price is not None else None,
		'sellingPrice': float(material.selling_price) if material.selling_price is not None else None,
		'active': material.active,
	}


def size_payload(size):
	return {
		'_id': str(size.id),
		'value': size.value,
		'materialId': str(size.material_id),
		'buyingPrice': float(size.buying_price) if size.buying_price is not None else None,
		'sellingPrice': float(size.selling_price) if size.selling_price is not None else None,
		'active': size.active,
	}


def fitting_payload(fitting):
	return {
		'_id': str(fitting.id),
		'name': fitting.name,
		'materialId': str(fitting.material_id),
		'buyingPrice': float(fitting.buying_price) if fitting.buying_price is not None else None,
		'sellingPrice': float(fitting.selling_price) if fitting.selling_price is not None else None,
		'active': fitting.active,
	}


@api_view(['GET'])
def catalog_root(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	cached_payload, cache_key = get_user_cached_payload(user.id, 'catalog.root')
	if cached_payload is not None:
		return cached_response(cached_payload, hit=True)

	categories = Category.objects.filter(owner=user, active=True).order_by('id')
	materials = Material.objects.filter(owner=user, active=True).order_by('id')
	sizes = Size.objects.filter(owner=user, active=True).order_by('id')
	fittings = Fitting.objects.filter(owner=user, active=True).order_by('id')

	payload = {
		'categories': [category_payload(c) for c in categories],
		'materials': [material_payload(m) for m in materials],
		'sizes': [size_payload(s) for s in sizes],
		'fittings': [fitting_payload(f) for f in fittings],
	}
	set_user_cached_payload(cache_key, payload, timeout=getattr(settings, 'CACHE_DEFAULT_TTL', 300))
	return cached_response(payload, hit=False)


@api_view(['POST'])
def categories_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	name = (request.data.get('name') or '').strip()
	if not name:
		return Response({'error': 'Category name is required'}, status=400)

	if Category.objects.filter(owner=user, name=name, active=True).exists():
		return Response({'error': 'Category already exists'}, status=400)

	category = Category.objects.create(owner=user, name=name, active=True)
	invalidate_user_cache(user.id)
	return Response(
		{
			'success': True,
			'message': 'Category added successfully',
			'category': category_payload(category),
		},
		status=201,
	)


@api_view(['PUT', 'DELETE'])
def category_detail_view(request, item_id):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	category = Category.objects.filter(pk=item_id, owner=user, active=True).first()
	if not category:
		return Response({'error': 'Category not found'}, status=404)

	if request.method == 'PUT':
		name = (request.data.get('name') or '').strip()
		if not name:
			return Response({'error': 'Category name is required'}, status=400)

		duplicate = Category.objects.filter(owner=user, active=True, name=name).exclude(pk=category.id).exists()
		if duplicate:
			return Response({'error': 'Category with this name already exists'}, status=400)

		category.name = name
		category.save(update_fields=['name', 'updated_at'])
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Category updated', 'category': category_payload(category)})

	category.active = False
	category.save(update_fields=['active', 'updated_at'])

	materials = Material.objects.filter(category=category, owner=user)
	material_ids = list(materials.values_list('id', flat=True))
	materials.update(active=False)

	if material_ids:
		Size.objects.filter(material_id__in=material_ids, owner=user).update(active=False)
		Fitting.objects.filter(material_id__in=material_ids, owner=user).update(active=False)
	invalidate_user_cache(user.id)

	return Response({'success': True, 'message': 'Category deleted successfully'})


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
def materials_view(request, ref_id=None):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	if request.method == 'GET':
		if ref_id is None:
			return Response([])

		category = Category.objects.filter(pk=ref_id, owner=user, active=True).first()
		if not category:
			return Response({'error': 'Category not found'}, status=404)

		materials = Material.objects.filter(category=category, owner=user, active=True).order_by('id')
		return Response([material_payload(m) for m in materials])

	if request.method == 'POST':
		category_id = request.data.get('categoryId')
		name = (request.data.get('name') or '').strip()

		if not category_id or not name:
			return Response({'error': 'Category and material name are required'}, status=400)

		category = Category.objects.filter(pk=category_id, owner=user, active=True).first()
		if not category:
			return Response({'error': 'Category not found'}, status=404)

		duplicate = Material.objects.filter(owner=user, category=category, active=True, name=name).exists()
		if duplicate:
			return Response({'error': 'Material already exists in this category'}, status=400)

		material = Material.objects.create(
			owner=user,
			category=category,
			name=name,
			buying_price=parse_price_input(request.data.get('buyingPrice')),
			selling_price=parse_price_input(request.data.get('sellingPrice')),
			active=True,
		)
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Material added successfully', 'material': material_payload(material)}, status=201)

	if ref_id is None:
		return Response({'error': 'Material id is required'}, status=400)

	material = Material.objects.filter(pk=ref_id, owner=user, active=True).first()
	if not material:
		return Response({'error': 'Material not found'}, status=404)

	if request.method == 'PUT':
		name = (request.data.get('name') or '').strip()
		if not name:
			return Response({'error': 'Material name is required'}, status=400)

		duplicate = Material.objects.filter(
			owner=user,
			category=material.category,
			active=True,
			name=name,
		).exclude(pk=material.id).exists()
		if duplicate:
			return Response({'error': 'Material with this name already exists in this category'}, status=400)

		material.name = name
		if 'buyingPrice' in request.data:
			material.buying_price = parse_price_input(request.data.get('buyingPrice'))
		if 'sellingPrice' in request.data:
			material.selling_price = parse_price_input(request.data.get('sellingPrice'))
		material.save(update_fields=['name', 'buying_price', 'selling_price', 'updated_at'])
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Material updated', 'material': material_payload(material)})

	material.active = False
	material.save(update_fields=['active', 'updated_at'])
	Size.objects.filter(material=material, owner=user).update(active=False)
	Fitting.objects.filter(material=material, owner=user).update(active=False)
	invalidate_user_cache(user.id)
	return Response({'success': True, 'message': 'Material deleted successfully'})


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
def sizes_view(request, ref_id=None):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	if request.method == 'GET':
		if ref_id is None:
			return Response([])
		material = Material.objects.filter(pk=ref_id, owner=user, active=True).first()
		if not material:
			return Response({'error': 'Material not found'}, status=404)

		sizes = Size.objects.filter(material=material, owner=user, active=True).order_by('id')
		return Response([size_payload(s) for s in sizes])

	if request.method == 'POST':
		material_id = request.data.get('materialId')
		value = (request.data.get('value') or '').strip()
		if not material_id or not value:
			return Response({'error': 'Material and size value are required'}, status=400)

		material = Material.objects.filter(pk=material_id, owner=user, active=True).first()
		if not material:
			return Response({'error': 'Material not found'}, status=404)

		duplicate = Size.objects.filter(owner=user, material=material, active=True, value=value).exists()
		if duplicate:
			return Response({'error': 'Size already exists for this material'}, status=400)

		size = Size.objects.create(
			owner=user,
			material=material,
			value=value,
			buying_price=parse_price_input(request.data.get('buyingPrice')),
			selling_price=parse_price_input(request.data.get('sellingPrice')),
			active=True,
		)
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Size added successfully', 'size': size_payload(size)}, status=201)

	if ref_id is None:
		return Response({'error': 'Size id is required'}, status=400)

	size = Size.objects.filter(pk=ref_id, owner=user, active=True).first()
	if not size:
		return Response({'error': 'Size not found'}, status=404)

	if request.method == 'PUT':
		value = (request.data.get('value') or '').strip()
		if not value:
			return Response({'error': 'Size value is required'}, status=400)

		duplicate = Size.objects.filter(owner=user, material=size.material, active=True, value=value).exclude(pk=size.id).exists()
		if duplicate:
			return Response({'error': 'Size with this value already exists for this material'}, status=400)

		size.value = value
		if 'buyingPrice' in request.data:
			size.buying_price = parse_price_input(request.data.get('buyingPrice'))
		if 'sellingPrice' in request.data:
			size.selling_price = parse_price_input(request.data.get('sellingPrice'))
		size.save(update_fields=['value', 'buying_price', 'selling_price', 'updated_at'])
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Size updated', 'size': size_payload(size)})

	size.active = False
	size.save(update_fields=['active', 'updated_at'])
	invalidate_user_cache(user.id)
	return Response({'success': True, 'message': 'Size deleted successfully'})


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
def fittings_view(request, ref_id=None):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	if request.method == 'GET':
		if ref_id is None:
			return Response([])
		material = Material.objects.filter(pk=ref_id, owner=user, active=True).first()
		if not material:
			return Response({'error': 'Material not found'}, status=404)

		fittings = Fitting.objects.filter(material=material, owner=user, active=True).order_by('id')
		return Response([fitting_payload(f) for f in fittings])

	if request.method == 'POST':
		material_id = request.data.get('materialId')
		name = (request.data.get('name') or '').strip()
		if not material_id or not name:
			return Response({'error': 'Material and fitting name are required'}, status=400)

		material = Material.objects.filter(pk=material_id, owner=user, active=True).first()
		if not material:
			return Response({'error': 'Material not found'}, status=404)

		duplicate = Fitting.objects.filter(owner=user, material=material, active=True, name=name).exists()
		if duplicate:
			return Response({'error': 'Fitting already exists for this material'}, status=400)

		fitting = Fitting.objects.create(
			owner=user,
			material=material,
			name=name,
			buying_price=parse_price_input(request.data.get('buyingPrice')),
			selling_price=parse_price_input(request.data.get('sellingPrice')),
			active=True,
		)
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Fitting added successfully', 'fitting': fitting_payload(fitting)}, status=201)

	if ref_id is None:
		return Response({'error': 'Fitting id is required'}, status=400)

	fitting = Fitting.objects.filter(pk=ref_id, owner=user, active=True).first()
	if not fitting:
		return Response({'error': 'Fitting not found'}, status=404)

	if request.method == 'PUT':
		name = (request.data.get('name') or '').strip()
		if not name:
			return Response({'error': 'Fitting name is required'}, status=400)

		duplicate = Fitting.objects.filter(owner=user, material=fitting.material, active=True, name=name).exclude(pk=fitting.id).exists()
		if duplicate:
			return Response({'error': 'Fitting with this name already exists for this material'}, status=400)

		fitting.name = name
		if 'buyingPrice' in request.data:
			fitting.buying_price = parse_price_input(request.data.get('buyingPrice'))
		if 'sellingPrice' in request.data:
			fitting.selling_price = parse_price_input(request.data.get('sellingPrice'))
		fitting.save(update_fields=['name', 'buying_price', 'selling_price', 'updated_at'])
		invalidate_user_cache(user.id)
		return Response({'success': True, 'message': 'Fitting updated', 'fitting': fitting_payload(fitting)})

	fitting.active = False
	fitting.save(update_fields=['active', 'updated_at'])
	invalidate_user_cache(user.id)
	return Response({'success': True, 'message': 'Fitting deleted successfully'})


@api_view(['PUT'])
def update_prices_view(request, item_type, item_id):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	model_map = {
		'material': Material,
		'size': Size,
		'fitting': Fitting,
	}
	payload_map = {
		'material': material_payload,
		'size': size_payload,
		'fitting': fitting_payload,
	}

	model = model_map.get(item_type)
	if not model:
		return Response({'error': 'Invalid type. Use material, size, or fitting'}, status=400)

	item = model.objects.filter(pk=item_id, owner=user, active=True).first()
	if not item:
		return Response({'error': 'Item not found'}, status=404)

	item.buying_price = parse_price_input(request.data.get('buyingPrice'))
	item.selling_price = parse_price_input(request.data.get('sellingPrice'))
	item.save(update_fields=['buying_price', 'selling_price', 'updated_at'])
	invalidate_user_cache(user.id)

	return Response({'success': True, 'message': 'Prices updated', 'item': payload_map[item_type](item)})


@api_view(['POST'])
def clear_all_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	sizes_deleted, _ = Size.objects.filter(owner=user).delete()
	fittings_deleted, _ = Fitting.objects.filter(owner=user).delete()
	materials_deleted, _ = Material.objects.filter(owner=user).delete()
	categories_deleted, _ = Category.objects.filter(owner=user).delete()
	invalidate_user_cache(user.id)

	return Response(
		{
			'success': True,
			'message': 'Catalog cleared successfully',
			'deleted': {
				'categories': categories_deleted,
				'materials': materials_deleted,
				'sizes': sizes_deleted,
				'fittings': fittings_deleted,
			},
		}
	)


@api_view(['POST'])
def seed_default_view(request):
	user, auth_error = auth_or_401(request)
	if auth_error:
		return auth_error

	created = seed_default_catalog_for_user(user)
	invalidate_user_cache(user.id)
	return Response(
		{
			'success': True,
			'message': 'Default catalog seeded successfully',
			'created': created,
		}
	)
