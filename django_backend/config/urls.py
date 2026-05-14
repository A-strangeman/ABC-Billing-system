"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from billing_data.views import bills_view
from catalog.views import catalog_root
from customers.views import customers_view
from drafts.views import drafts_view
from reports_api.views import reports_root_view
from whatsapp_api.views import send_invoice_view


def health_view(request):
    return JsonResponse({'status': 'OK', 'service': 'django-backend'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health', health_view),
    path('api/catalog', catalog_root),
    path('api/bills', bills_view),
    path('api/customers', customers_view),
    path('api/drafts', drafts_view),
    path('api/reports', reports_root_view),
    path('api/whatsapp/send-invoice', send_invoice_view),
    path('api/auth/', include('accounts.urls')),
    path('api/catalog/', include('catalog.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/bills/', include('billing_data.urls')),
    path('api/drafts/', include('drafts.urls')),
    path('api/reports/', include('reports_api.urls')),
    path('api/whatsapp/', include('whatsapp_api.urls')),
]
