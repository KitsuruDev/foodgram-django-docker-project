"""
URL configuration for foodgram project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from django.views.generic import TemplateView, CreateView

from . import views
import recipes.views as recipes_views
from users.forms import CustomUserCreationForm


urlpatterns = [
    # Админка
    path('admin/', admin.site.urls),
    
    # API
    path('api/', include('api.urls')),
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.authtoken')),
    
    # Главная страница
    path('', views.HomeView.as_view(), name='index'),
    
    # Аутентификация
    path('auth/login/', auth_views.LoginView.as_view(
        template_name='users/login.html',
        redirect_authenticated_user=True
    ), name='login'),
    
    path('auth/logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    
    path('auth/signup/', CreateView.as_view(
        template_name='users/signup.html',
        form_class=CustomUserCreationForm,
        success_url='/auth/login/'
    ), name='signup'),
    
    path('auth/password_change/', auth_views.PasswordChangeView.as_view(
        template_name='users/password_change.html',
        success_url='/auth/password_change/done/'
    ), name='password_change'),
    
    path('auth/password_change/done/', auth_views.PasswordChangeDoneView.as_view(
        template_name='users/password_change_done.html'
    ), name='password_change_done'),
    
    # Профиль пользователя
    path('users/', include('users.urls')),
    
    # Рецепты
    path('recipes/', include([
        path('', TemplateView.as_view(template_name='index.html'), name='recipes'),
        path('create/', recipes_views.RecipeCreateView.as_view(), name='create_recipe'),
        path('<int:pk>/', recipes_views.RecipeDetailView.as_view(), name='detail_recipe'),
        path('<int:pk>/edit/', recipes_views.RecipeUpdateView.as_view(), name='edit_recipe'),
        path('<int:pk>/delete/', recipes_views.RecipeDeleteView.as_view(), name='delete_recipe'),
    ])),
    
    # Избранное, подписки, список покупок
    path('favorites/', TemplateView.as_view(template_name='recipes/favorites.html'), name='favorites'),
    path('subscriptions/', TemplateView.as_view(template_name='users/subscriptions.html'), name='subscriptions'),
    path('shopping-list/', TemplateView.as_view(template_name='shopping_list/shopping_list.html'), name='shopping_list'),
    
    # Статические страницы
    path('about/', views.AboutView.as_view(), name='about'),
    path('tech/', views.TechView.as_view(), name='tech'),
]

# Обработчики ошибок
handler404 = views.custom_404
handler500 = views.custom_500

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)