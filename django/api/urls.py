from django.urls import path
from . import views

urlpatterns = [
    path('users/',           views.list_users),
    path('sip/credentials/', views.sip_credentials),
]
