from django.shortcuts import get_object_or_404, redirect, render
from django.views.generic import View, DetailView, DeleteView
from django.http import HttpResponse
from django.urls import reverse_lazy
from django.db.models import Sum
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib import messages
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
import json
from .models import (
    Recipe, Ingredient, Tag,
    Favorite, ShoppingCart, Subscription,
    RecipeIngredient
)
from .serializers import (
    RecipeSerializer, RecipeCreateUpdateSerializer,
    IngredientSerializer, TagSerializer
)
from .forms import RecipeForm
from .permissions import IsAuthorOrReadOnly
from .filters import RecipeFilter, IngredientFilter


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all()
    permission_classes = [IsAuthorOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = RecipeFilter

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RecipeCreateUpdateSerializer
        return RecipeSerializer

    @action(detail=True, methods=['post', 'delete'],
            permission_classes=[IsAuthenticated])
    def favorite(self, request, pk=None):
        recipe = self.get_object()
        user = request.user
        if request.method == 'POST':
            if Favorite.objects.filter(user=user, recipe=recipe).exists():
                return Response(
                    {'errors': 'Рецепт уже в избранном.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            Favorite.objects.create(user=user, recipe=recipe)
            return Response(status=status.HTTP_201_CREATED)
        else:
            favorite = get_object_or_404(Favorite, user=user, recipe=recipe)
            favorite.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post', 'delete'],
            permission_classes=[IsAuthenticated])
    def shopping_cart(self, request, pk=None):
        recipe = self.get_object()
        user = request.user
        if request.method == 'POST':
            if ShoppingCart.objects.filter(user=user, recipe=recipe).exists():
                return Response(
                    {'errors': 'Рецепт уже в корзине.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            ShoppingCart.objects.create(user=user, recipe=recipe)
            return Response(status=status.HTTP_201_CREATED)
        else:
            cart_item = get_object_or_404(
                ShoppingCart, user=user, recipe=recipe
            )
            cart_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'],
            permission_classes=[IsAuthenticated])
    def download_shopping_cart(self, request):
        user = request.user
        ingredients = RecipeIngredient.objects.filter(
            recipe__in_shopping_cart__user=user
        ).values(
            'ingredient__name',
            'ingredient__measurement_unit'
        ).annotate(total=Sum('amount'))

        shopping_list = []
        for item in ingredients:
            shopping_list.append(
                f"{item['ingredient__name']} "
                f"({item['ingredient__measurement_unit']}) — {item['total']}"
            )

        response = HttpResponse(
            '\n'.join(shopping_list),
            content_type='text/plain'
        )
        response['Content-Disposition'] = (
            'attachment; filename="shopping_list.txt"'
        )
        return response


class IngredientViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_class = IngredientFilter
    pagination_class = None


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class RecipeDetailView(DetailView):
    model = Recipe
    template_name = 'recipes/detail.html'
    context_object_name = 'recipe'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        recipe = self.get_object()
        
        # Добавляем дополнительные данные
        context['is_subscribed'] = False
        if self.request.user.is_authenticated:
            # Проверяем подписку
            context['is_subscribed'] = self.request.user.subscriptions.filter(
                author=recipe.author
            ).exists()
        
        return context


class RecipeCreateUpdateView(LoginRequiredMixin, View):
    template_name = 'recipes/form.html'
    
    def get(self, request, pk=None):
        # Если есть pk - редактирование, если нет - создание
        if pk:
            recipe = get_object_or_404(Recipe, pk=pk, author=request.user)
            form = RecipeForm(instance=recipe)
            is_edit = True
        else:
            recipe = None
            form = RecipeForm()
            is_edit = False
        
        # Получаем все ингредиенты для выпадающего списка
        ingredients = Ingredient.objects.all().order_by('name')
        tags = Tag.objects.all()
        
        # Получаем ингредиенты рецепта для редактирования
        recipe_ingredients = []
        if recipe:
            recipe_ingredients = RecipeIngredient.objects.filter(recipe=recipe).select_related('ingredient')
        
        context = {
            'form': form,
            'ingredients': ingredients,
            'tags': tags,
            'recipe_ingredients': recipe_ingredients,
            'is_edit': is_edit,
            'recipe': recipe,  # Добавляем сам рецепт в контекст
        }
        
        return render(request, self.template_name, context)
    
    def post(self, request, pk=None):
        # Определяем, редактируем или создаем
        if pk:
            recipe = get_object_or_404(Recipe, pk=pk, author=request.user)
            form = RecipeForm(request.POST, request.FILES, instance=recipe)
            is_edit = True
        else:
            recipe = None
            form = RecipeForm(request.POST, request.FILES)
            is_edit = False
        
        if form.is_valid():
            # Сохраняем рецепт без коммита
            recipe = form.save(commit=False)
            
            # При создании устанавливаем автора
            if not is_edit:
                recipe.author = request.user
            
            recipe.save()
            
            # Сохраняем теги
            tags_ids = request.POST.getlist('tags')
            recipe.tags.set(Tag.objects.filter(id__in=tags_ids))
            
            # Обрабатываем ингредиенты из JSON
            ingredients_data = request.POST.get('ingredients_data')
            
            if ingredients_data:
                try:
                    ingredients_list = json.loads(ingredients_data)
                    
                    # Удаляем старые связи (при редактировании)
                    RecipeIngredient.objects.filter(recipe=recipe).delete()
                    
                    # Создаем новые связи
                    for item in ingredients_list:
                        try:
                            ingredient_id = item.get('id')
                            amount = item.get('amount')
                            
                            if ingredient_id and amount:
                                ingredient = Ingredient.objects.get(id=ingredient_id)
                                RecipeIngredient.objects.create(
                                    recipe=recipe,
                                    ingredient=ingredient,
                                    amount=amount
                                )
                        except Ingredient.DoesNotExist:
                            continue
                        except Exception as e:
                            print(f"Ошибка при создании связи: {e}")
                            continue
                            
                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    print(f"Общая ошибка при обработке ингредиентов: {e}")
            
            # Сохраняем ManyToMany поля
            form.save_m2m()
            
            # Перенаправляем на страницу рецепта
            return redirect('detail_recipe', pk=recipe.pk)
        
        # Если форма не валидна
        ingredients = Ingredient.objects.all().order_by('name')
        tags = Tag.objects.all()
        
        context = {
            'form': form,
            'ingredients': ingredients,
            'tags': tags,
            'is_edit': is_edit,
            'recipe': recipe,
        }
        
        return render(request, self.template_name, context)


class RecipeDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Recipe
    template_name = 'recipes/delete_confirm.html'
    success_url = reverse_lazy('index')
    
    def test_func(self):
        recipe = self.get_object()
        return self.request.user == recipe.author
    
    def delete(self, request, *args, **kwargs):
        messages.success(request, 'Рецепт успешно удален')
        return super().delete(request, *args, **kwargs)