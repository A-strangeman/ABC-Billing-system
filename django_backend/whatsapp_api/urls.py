from django.urls import path

from . import views

urlpatterns = [
    path('send-invoice', views.send_invoice_view),
]
