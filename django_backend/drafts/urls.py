from django.urls import path
from . import views

urlpatterns = [
    path('', views.drafts_view),
    path('<int:item_id>', views.draft_detail_view),
]
