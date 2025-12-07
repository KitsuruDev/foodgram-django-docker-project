from django.shortcuts import render
from django.views.generic import TemplateView
from django.http import Http404


def custom_404(request, exception=None):
    """Кастомная страница 404 ошибки."""
    return render(request, 'errors/404.html', status=404)


def custom_500(request):
    """Кастомная страница 500 ошибки."""
    return render(request, 'errors/500.html', status=500)


class HomeView(TemplateView):
    """Главная страница с рецептами."""
    template_name = 'index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Здесь можно добавить данные для главной страницы
        # Например, список рецептов
        return context


class AboutView(TemplateView):
    """Страница 'О проекте'."""
    template_name = 'pages/about.html'


class TechView(TemplateView):
    """Страница 'Технологии'."""
    template_name = 'pages/tech.html'