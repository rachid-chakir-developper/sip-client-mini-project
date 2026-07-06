from django.urls import path
from . import views

urlpatterns = [
    path('auth/csrf/',    views.csrf),
    path('auth/login/',   views.auth_login),
    path('auth/logout/',  views.auth_logout),
    path('auth/me/',      views.auth_me),
    path('sip/me/',       views.sip_me),
    path('sip/contacts/', views.contacts),
]
