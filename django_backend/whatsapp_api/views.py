import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen

from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.auth_utils import get_authenticated_user


def auth_or_401(request):
    user = get_authenticated_user(request)
    if not user:
        return None, Response({'success': False, 'error': 'Authentication required. No token provided.'}, status=401)
    return user, None


def normalize_phone(raw):
    digits = ''.join(ch for ch in str(raw or '') if ch.isdigit())
    if len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    if len(digits) == 10:
        digits = f'91{digits}'
    return digits


@api_view(['POST'])
def send_invoice_view(request):
    _, auth_error = auth_or_401(request)
    if auth_error:
        return auth_error

    payload = request.data or {}
    customer_phone = payload.get('customerPhone')
    message_text = payload.get('messageText')

    if not customer_phone or not message_text:
        return Response({'error': 'customerPhone and messageText are required.'}, status=400)

    to = normalize_phone(customer_phone)
    if len(to) < 10:
        return Response({'error': 'Invalid customer phone number.'}, status=400)

    wa_link = f"https://wa.me/{to}?text={quote(str(message_text))}"

    phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '').strip()
    access_token = os.getenv('WHATSAPP_ACCESS_TOKEN', '').strip()
    graph_version = os.getenv('WHATSAPP_GRAPH_VERSION', 'v19.0').strip() or 'v19.0'

    # Graceful fallback: if Cloud API is not configured, return wa.me link so frontend still works.
    if not phone_number_id or not access_token:
        return Response(
            {
                'success': True,
                'configured': False,
                'message': 'WhatsApp Cloud API not configured. Use wa.me link fallback.',
                'waLink': wa_link,
            }
        )

    body = {
        'messaging_product': 'whatsapp',
        'to': to,
        'type': 'text',
        'text': {
            'preview_url': False,
            'body': str(message_text),
        },
    }

    req = Request(
        url=f'https://graph.facebook.com/{graph_version}/{phone_number_id}/messages',
        data=json.dumps(body).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with urlopen(req, timeout=12) as resp:
            raw = resp.read().decode('utf-8')
            graph_response = json.loads(raw) if raw else {}

        return Response(
            {
                'success': True,
                'configured': True,
                'message': 'WhatsApp text message sent successfully.',
                'waLink': wa_link,
                'result': graph_response,
            }
        )
    except Exception as exc:
        return Response(
            {
                'success': True,
                'configured': True,
                'message': 'Cloud send failed, use wa.me link fallback.',
                'waLink': wa_link,
                'fallbackError': str(exc),
            }
        )
