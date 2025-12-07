from django.urls import include, path
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet
from recipes.views import (
    RecipeViewSet, IngredientViewSet, TagViewSet
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')
router.register('recipes', RecipeViewSet, basename='recipes')
router.register('ingredients', IngredientViewSet, basename='ingredients')
router.register('tags', TagViewSet, basename='tags')

urlpatterns = [
    path('', include(router.urls)),
]