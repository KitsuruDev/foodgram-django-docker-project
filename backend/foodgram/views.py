from django.shortcuts import render
from django.views.generic import TemplateView, ListView
from django.http import Http404
from recipes.models import Recipe


def custom_404(request, exception=None):
    """Кастомная страница 404 ошибки."""
    return render(request, 'errors/404.html', status=404)


def custom_500(request):
    """Кастомная страница 500 ошибки."""
    return render(request, 'errors/500.html', status=500)


class HomeView(ListView):
    model = Recipe
    template_name = 'index.html'
    context_object_name = 'recipes'
    paginate_by = 6
    
    def get_queryset(self):
        return Recipe.objects.all().order_by('-created_at')


class AboutView(TemplateView):
    """Страница 'О проекте'."""
    template_name = 'pages/about.html'


class TechView(TemplateView):
    """Страница 'Технологии'."""
    template_name = 'pages/tech.html'