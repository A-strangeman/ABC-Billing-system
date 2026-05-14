from django.urls import path
from . import views

urlpatterns = [
    path('request-otp', views.request_otp_view),
    path('reset-password', views.reset_password_view),
    path('google-login', views.google_login_view),
    path('login', views.login_view),
    path('logout', views.logout_view),
    path('register', views.register_view),
    path('verify', views.verify_view),
    path('profile', views.profile_view),
    path('change-password', views.change_password_view),
    path('delete-account', views.delete_account_view),
]
