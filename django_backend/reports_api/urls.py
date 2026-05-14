from django.urls import path
from . import views

urlpatterns = [
    path('', views.reports_root_view),
    path('summary', views.summary_view),
    path('revenue-trend', views.revenue_trend_view),
    path('top-customers', views.top_customers_view),
    path('top-products', views.top_products_view),
    path('payment-status', views.payment_status_view),
    path('recent-bills', views.recent_bills_view),
]
