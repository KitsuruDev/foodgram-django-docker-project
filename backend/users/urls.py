from django.urls import path
from django.views.generic import TemplateView
from . import views

app_name = 'users'

urlpatterns = [
    path('<str:username>/', TemplateView.as_view(template_name='users/profile.html'), name='profile'),
    path('signup/', TemplateView.as_view(template_name='users/signup.html'), name='signup'),
]