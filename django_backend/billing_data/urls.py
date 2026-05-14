from django.urls import path
from . import views

urlpatterns = [
    path('', views.bills_view),
    path('next-invoice', views.next_invoice_view),
    path('price-history/<str:product_name>', views.price_history_view),
    path('<int:item_id>', views.bill_detail_view),
]
