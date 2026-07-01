from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as drf_status
from django.conf import settings
from .users import USERS, get_user_by_extension


@api_view(['GET'])
def list_users(request):
    data = [
        {
            'username':   u['username'],
            'first_name': u['first_name'],
            'last_name':  u['last_name'],
            'extension':  u['extension'],
        }
        for u in USERS
    ]
    return Response(data)


@api_view(['GET'])
def sip_credentials(request):
    """
    Returns the user's SIP credentials.
    Security: always call over HTTPS — credentials are encrypted in transit (TLS).
    """
    extension = request.query_params.get('extension')
    if not extension:
        return Response(
            {'error': 'Paramètre extension manquant'},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    user = get_user_by_extension(extension)
    if not user:
        return Response(
            {'error': 'Utilisateur introuvable'},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    return Response({
        'extension':    user['extension'],
        'password':     user['sip_password'],
        'display_name': f"{user['first_name']} {user['last_name']}",
        'server':       getattr(settings, 'ASTERISK_HOST', 'localhost'),
        'ws_url':       getattr(settings, 'ASTERISK_WS_URL', 'ws://localhost:8088/ws'),
    })
