from django.urls import path
from django.views.generic import TemplateView

app_name = 'users'

urlpatterns = [
    path('<str:username>/', TemplateView.as_view(template_name='users/profile.html'), name='profile'),
]