from django.urls import path
from . import views

urlpatterns = [
    path('', views.catalog_root),
    path('categories', views.categories_view),
    path('categories/<int:item_id>', views.category_detail_view),
    path('materials', views.materials_view),
    path('materials/<int:ref_id>', views.materials_view),
    path('sizes', views.sizes_view),
    path('sizes/<int:ref_id>', views.sizes_view),
    path('fittings', views.fittings_view),
    path('fittings/<int:ref_id>', views.fittings_view),
    path('prices/<str:item_type>/<int:item_id>', views.update_prices_view),
    path('seed-default', views.seed_default_view),
    path('clear-all', views.clear_all_view),
]
