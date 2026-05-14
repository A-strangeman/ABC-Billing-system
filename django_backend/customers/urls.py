from django.urls import path
from . import views

urlpatterns = [
    path('', views.customers_view),
    path('search', views.search_customers_view),
    path('<int:item_id>', views.customer_detail_view),
]
