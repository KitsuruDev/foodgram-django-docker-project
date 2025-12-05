import django_filters
from .models import Recipe, Ingredient

class RecipeFilter(django_filters.FilterSet):
    tags = django_filters.CharFilter(method='filter_tags')
    is_favorited = django_filters.BooleanFilter(method='filter_favorited')
    is_in_shopping_cart = django_filters.BooleanFilter(
        method='filter_shopping_cart'
    )

    class Meta:
        model = Recipe
        fields = ['author', 'tags']

    def filter_tags(self, queryset, name, value):
        tag_slugs = self.request.query_params.getlist('tags')
        for slug in tag_slugs:
            queryset = queryset.filter(tags__slug=slug)
        return queryset.distinct()

    def filter_favorited(self, queryset, name, value):
        user = self.request.user
        if value and user.is_authenticated:
            return queryset.filter(favorited_by__user=user)
        return queryset

    def filter_shopping_cart(self, queryset, name, value):
        user = self.request.user
        if value and user.is_authenticated:
            return queryset.filter(in_shopping_cart__user=user)
        return queryset

class IngredientFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='istartswith')

    class Meta:
        model = Ingredient
        fields = ['name']