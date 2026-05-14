import os
import random
import logging
from datetime import datetime, timedelta, timezone

import jwt
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

try:
	from google.auth.transport import requests as google_requests
	from google.oauth2 import id_token as google_id_token
except Exception:  # pragma: no cover - graceful fallback if dependency is missing
	google_requests = None
	google_id_token = None

from .auth_utils import get_authenticated_user

User = get_user_model()
JWT_SECRET = os.getenv('JWT_SECRET', 'change-this-secret')
OTP_TTL_SECONDS = int(os.getenv('OTP_TTL_SECONDS', '300'))
OTP_LOG_IN_CONSOLE = os.getenv('OTP_LOG_IN_CONSOLE', 'true').lower() == 'true'
logger = logging.getLogger(__name__)


def _otp_key(mobile_no, purpose='register'):
	return f"otp:{purpose}:{mobile_no}"


def _normalize_mobile(value):
	return ''.join(ch for ch in str(value or '') if ch.isdigit())


def _generate_username(organization_name, mobile_no):
	base = ''.join(ch.lower() if ch.isalnum() else '_' for ch in str(organization_name or '').strip())
	base = '_'.join(part for part in base.split('_') if part)
	if not base:
		base = f"user_{mobile_no}"

	username = base
	counter = 1
	while User.objects.filter(username=username).exists():
		counter += 1
		username = f"{base}_{counter}"
	return username


def _generate_username_from_email(email):
	base = (email.split('@')[0] if '@' in email else email).strip().lower()
	base = ''.join(ch if ch.isalnum() else '_' for ch in base)
	base = '_'.join(part for part in base.split('_') if part)
	if not base:
		base = 'google_user'

	username = base
	counter = 1
	while User.objects.filter(username=username).exists():
		counter += 1
		username = f"{base}_{counter}"
	return username


def build_user_payload(user):
	return {
		'username': user.username,
		'role': user.role,
		'firstName': user.first_name or '',
		'lastName': user.last_name or '',
		'organizationName': user.organization_name or user.username or '',
		'address': user.address or '',
		'mobileNo': user.mobile_no or '',
	}


def encode_token(user):
	payload = {
		'userId': user.id,
		'username': user.username,
		'role': user.role,
		'exp': datetime.now(tz=timezone.utc) + timedelta(hours=24),
	}
	return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


@api_view(['POST'])
def register_view(request):
	organization_name = (request.data.get('organizationName') or '').strip()
	mobile_no = _normalize_mobile(request.data.get('mobileNo'))
	otp_code = str(request.data.get('otpCode') or '').strip()
	password = request.data.get('password') or ''
	role = (request.data.get('role') or 'admin').strip().lower()
	first_name = (request.data.get('firstName') or '').strip()
	last_name = (request.data.get('lastName') or '').strip()

	if not organization_name or not password:
		return Response({'error': 'Organization name and password are required'}, status=400)

	if not mobile_no or len(mobile_no) != 10:
		return Response({'error': 'Valid 10-digit mobile number required'}, status=400)

	if len(password) < 6:
		return Response({'error': 'Password must be at least 6 characters'}, status=400)

	if role not in {'admin', 'accountant', 'staff', 'viewer', 'cashier'}:
		return Response({'error': 'Invalid role selected'}, status=400)

	otp_payload = cache.get(_otp_key(mobile_no))
	if not otp_payload:
		return Response({'error': 'OTP expired or not requested'}, status=400)

	if otp_payload.get('code') != otp_code:
		return Response({'error': 'Invalid OTP code'}, status=400)

	cache.delete(_otp_key(mobile_no))

	username = _generate_username(organization_name, mobile_no)

	if User.objects.filter(username=username).exists():
		return Response({'error': 'Username already exists'}, status=400)

	if User.objects.filter(mobile_no=mobile_no).exists():
		return Response({'error': 'Mobile number already registered'}, status=400)

	user = User.objects.create(
		username=username,
		password=make_password(password),
		role=role,
		first_name=first_name,
		last_name=last_name,
		organization_name=organization_name or username,
		mobile_no=mobile_no,
	)

	return Response(
		{
			'success': True,
			'message': 'User registered successfully',
			'user': build_user_payload(user),
		},
		status=201,
	)



@api_view(['POST'])
def request_otp_view(request):
	mobile_no = _normalize_mobile(request.data.get('mobileNo'))
	purpose = str(request.data.get('purpose') or 'register').strip().lower()
	if purpose not in {'register', 'reset'}:
		return Response({'error': 'Invalid OTP purpose'}, status=400)

	if not mobile_no or len(mobile_no) != 10:
		return Response({'error': 'Valid 10-digit mobile number required'}, status=400)

	if purpose == 'register' and User.objects.filter(mobile_no=mobile_no).exists():
		return Response({'error': 'Mobile number already registered'}, status=400)

	if purpose == 'reset' and not User.objects.filter(mobile_no=mobile_no).exists():
		return Response({'error': 'No account found for this mobile number'}, status=404)

	otp_code = f"{random.randint(0, 999999):06d}"
	cache.set(
		_otp_key(mobile_no, purpose),
		{
			'code': otp_code,
			'expiresAt': (datetime.now(tz=timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)).isoformat(),
			'purpose': purpose,
		},
		timeout=OTP_TTL_SECONDS,
	)

	response = {
		'success': True,
		'message': 'OTP sent successfully',
		'expiresIn': OTP_TTL_SECONDS,
	}

	# In local/dev we return OTP so you can verify without SMS gateway integration.
	if os.getenv('DJANGO_DEBUG', 'true').lower() == 'true':
		response['otp'] = otp_code

	if OTP_LOG_IN_CONSOLE:
		logger.warning(
			"OTP generated | purpose=%s | mobile=%s | code=%s | expires_in=%s",
			purpose,
			mobile_no,
			otp_code,
			OTP_TTL_SECONDS,
		)

	return Response(response)


@api_view(['POST'])
def reset_password_view(request):
	mobile_no = _normalize_mobile(request.data.get('mobileNo'))
	otp_code = str(request.data.get('otpCode') or '').strip()
	new_password = request.data.get('newPassword') or ''

	if not mobile_no or len(mobile_no) != 10:
		return Response({'error': 'Valid 10-digit mobile number required'}, status=400)

	if not otp_code:
		return Response({'error': 'OTP code is required'}, status=400)

	if len(new_password) < 6:
		return Response({'error': 'New password must be at least 6 characters'}, status=400)

	otp_payload = cache.get(_otp_key(mobile_no, 'reset'))
	if not otp_payload:
		return Response({'error': 'OTP expired or not requested'}, status=400)

	if otp_payload.get('code') != otp_code:
		return Response({'error': 'Invalid OTP code'}, status=400)

	user = User.objects.filter(mobile_no=mobile_no).first()
	if not user:
		return Response({'error': 'No account found for this mobile number'}, status=404)

	user.set_password(new_password)
	user.save(update_fields=['password'])
	cache.delete(_otp_key(mobile_no, 'reset'))

	return Response({'success': True, 'message': 'Password reset successful'})


@api_view(['POST'])
def login_view(request):
	mobile_no = _normalize_mobile(request.data.get('mobileNo'))
	username = (request.data.get('username') or '').strip().lower()
	password = request.data.get('password') or ''

	if not password:
		return Response({'error': 'Password is required'}, status=400)

	if not mobile_no and not username:
		return Response({'error': 'Mobile number or username is required'}, status=400)

	if mobile_no and len(mobile_no) != 10:
		return Response({'error': 'Valid 10-digit mobile number required'}, status=400)

	user = User.objects.filter(mobile_no=mobile_no).first() if mobile_no else None
	if not user and username:
		user = User.objects.filter(username=username).first()
	if not user or not user.check_password(password):
		return Response({'error': 'Invalid mobile number/username or password'}, status=401)

	token = encode_token(user)
	response = Response(
		{
			'success': True,
			'message': 'Login successful',
			'user': build_user_payload(user),
			'token': token,
		}
	)

	is_production = os.getenv('DJANGO_DEBUG', 'true').lower() != 'true'
	response.set_cookie(
		key='token',
		value=token,
		httponly=True,
		max_age=24 * 60 * 60,
		samesite='None' if is_production else 'Lax',
		secure=is_production,
		path='/',
	)
	return response


@api_view(['POST'])
def google_login_view(request):
	if google_id_token is None or google_requests is None:
		return Response({'error': 'google-auth package is not installed on server'}, status=500)

	client_id = os.getenv('GOOGLE_CLIENT_ID', '').strip()
	if not client_id:
		return Response({'error': 'Google login is not configured on server'}, status=500)

	id_token_value = request.data.get('idToken') or ''
	if not id_token_value:
		return Response({'error': 'Google idToken is required'}, status=400)

	try:
		idinfo = google_id_token.verify_oauth2_token(
			id_token_value,
			google_requests.Request(),
			client_id,
		)
	except Exception:
		return Response({'error': 'Invalid Google token'}, status=401)

	email = (idinfo.get('email') or '').strip().lower()
	if not email:
		return Response({'error': 'Google account email is missing'}, status=400)

	first_name = (idinfo.get('given_name') or '').strip()
	last_name = (idinfo.get('family_name') or '').strip()
	full_name = (idinfo.get('name') or '').strip()

	user = User.objects.filter(email=email).first()
	if not user:
		username = _generate_username_from_email(email)
		user = User.objects.create(
			username=username,
			email=email,
			first_name=first_name,
			last_name=last_name,
			organization_name=full_name or email,
			role='admin',
		)
		user.set_unusable_password()
		user.save()
	else:
		updated_fields = []
		if first_name and user.first_name != first_name:
			user.first_name = first_name
			updated_fields.append('first_name')
		if last_name and user.last_name != last_name:
			user.last_name = last_name
			updated_fields.append('last_name')
		if full_name and not user.organization_name:
			user.organization_name = full_name
			updated_fields.append('organization_name')
		if updated_fields:
			user.save(update_fields=updated_fields)

	token = encode_token(user)
	response = Response(
		{
			'success': True,
			'message': 'Google login successful',
			'user': build_user_payload(user),
			'token': token,
		}
	)

	is_production = os.getenv('DJANGO_DEBUG', 'true').lower() != 'true'
	response.set_cookie(
		key='token',
		value=token,
		httponly=True,
		max_age=24 * 60 * 60,
		samesite='None' if is_production else 'Lax',
		secure=is_production,
		path='/',
	)
	return response


@api_view(['GET'])
def verify_view(request):
	user = get_authenticated_user(request)
	if not user:
		return Response({'error': 'Not authenticated'}, status=401)

	return Response({'success': True, 'user': build_user_payload(user)})


@api_view(['GET', 'PUT'])
def profile_view(request):
	user = get_authenticated_user(request)
	if not user:
		return Response({'error': 'Authentication required. No token provided.'}, status=401)

	if request.method == 'GET':
		return Response({'success': True, 'user': build_user_payload(user)})

	first_name = request.data.get('firstName')
	last_name = request.data.get('lastName')
	organization_name = request.data.get('organizationName')
	mobile_no = request.data.get('mobileNo')
	address = request.data.get('address')

	if first_name is not None:
		user.first_name = str(first_name).strip()
	if last_name is not None:
		user.last_name = str(last_name).strip()
	if organization_name is not None:
		user.organization_name = str(organization_name).strip()
	if mobile_no is not None:
		normalized_mobile = ''.join(ch for ch in str(mobile_no) if ch.isdigit())
		if not normalized_mobile or len(normalized_mobile) != 10:
			return Response({'error': 'Valid 10-digit mobile number required'}, status=400)
		user.mobile_no = normalized_mobile
	if address is not None:
		user.address = str(address).strip()

	user.save(update_fields=['first_name', 'last_name', 'organization_name', 'mobile_no', 'address'])
	return Response({'success': True, 'message': 'Profile updated successfully', 'user': build_user_payload(user)})


@api_view(['POST'])
def change_password_view(request):
	user = get_authenticated_user(request)
	if not user:
		return Response({'error': 'Authentication required. No token provided.'}, status=401)

	old_password = request.data.get('oldPassword') or ''
	new_password = request.data.get('newPassword') or ''

	if not old_password or not new_password or len(new_password) < 6:
		return Response({'error': 'Old password and new password (min 6 chars) are required'}, status=400)

	if not user.check_password(old_password):
		return Response({'error': 'Old password is incorrect'}, status=401)

	user.set_password(new_password)
	user.save(update_fields=['password'])
	return Response({'success': True, 'message': 'Password changed successfully'})


@api_view(['POST'])
def logout_view(request):
	response = Response({'success': True, 'message': 'Logged out successfully'})
	is_production = os.getenv('DJANGO_DEBUG', 'true').lower() != 'true'
	response.delete_cookie(
		key='token',
		path='/',
		samesite='None' if is_production else 'Lax',
	)
	return response


@api_view(['DELETE'])
def delete_account_view(request):
	user = get_authenticated_user(request)
	if not user:
		return Response({'error': 'Authentication required. No token provided.'}, status=401)

	user.delete()

	response = Response({'success': True, 'message': 'Account deleted successfully'})
	is_production = os.getenv('DJANGO_DEBUG', 'true').lower() != 'true'
	response.delete_cookie(
		key='token',
		path='/',
		samesite='None' if is_production else 'Lax',
	)
	return response
