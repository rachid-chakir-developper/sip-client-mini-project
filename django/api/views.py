from django.contrib.auth import authenticate, get_user_model, login, logout
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as drf_status

User = get_user_model()


def _serialize_user(user):
    return {
        'username':        user.username,
        'first_name':      user.first_name,
        'last_name':       user.last_name,
        'has_sip_account': hasattr(user, 'sip_account'),
    }


@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'detail': 'ok'})


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {'error': 'Invalid credentials'},
            status=drf_status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)
    return Response(_serialize_user(user))


@api_view(['POST'])
def auth_logout(request):
    logout(request)
    return Response(status=drf_status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def auth_me(request):
    return Response(_serialize_user(request.user))


@api_view(['GET'])
def sip_me(request):
    sip_account = getattr(request.user, 'sip_account', None)
    if sip_account is None:
        return Response(
            {'error': "No SIP account associated with this user"},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    return Response({
        'extension':    sip_account.extension,
        'password':     sip_account.get_password(),
        'display_name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        'server':       getattr(settings, 'ASTERISK_HOST', 'localhost'),
        'ws_url':       getattr(settings, 'ASTERISK_WS_URL', 'ws://localhost:8088/ws'),
    })


@api_view(['GET'])
def contacts(request):
    users = (
        User.objects
        .filter(sip_account__isnull=False)
        .exclude(pk=request.user.pk)
        .select_related('sip_account')
    )
    data = [
        {
            'username':   u.username,
            'first_name': u.first_name,
            'last_name':  u.last_name,
            'extension':  u.sip_account.extension,
        }
        for u in users
    ]
    return Response(data)
