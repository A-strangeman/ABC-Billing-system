import os

import jwt
from django.contrib.auth import get_user_model

User = get_user_model()
JWT_SECRET = os.getenv('JWT_SECRET', 'change-this-secret')


def get_token_from_request(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ', 1)[1]
    return request.COOKIES.get('token')


def get_authenticated_user(request):
    token = get_token_from_request(request)
    if not token:
        return None

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return User.objects.filter(pk=decoded.get('userId')).first()
    except jwt.InvalidTokenError:
        return None
