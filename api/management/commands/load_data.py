from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Очищает БД и загружает все фикстуры'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-clear',
            action='store_true',
            help='Пропустить очистку базы данных',
        )
        parser.add_argument(
            '--skip-recipes',
            action='store_true',
            help='Пропустить генерацию рецептов',
        )

    def handle(self, *args, **options):
        skip_clear = options['skip_clear']
        skip_recipes = options['skip_recipes']
        
        # Очищаем БД если не пропущено
        if not skip_clear:
            self.stdout.write(self.style.WARNING('Очистка базы данных...'))
            call_command('clear_data')
        
        self.stdout.write(self.style.WARNING('Загрузка фикстур...'))
        
        # Список фикстур в правильном порядке
        fixtures = [
            'users',        # Пользователи
            'ingredients',  # Ингредиенты
            'tags',         # Теги
        ]
        
        loaded_count = 0
        for fixture in fixtures:
            self.stdout.write(f"Загрузка {fixture}...")
            try:
                call_command('loaddata', f'{fixture}.json')
                loaded_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Не удалось загрузить {fixture}, ошибка: {e}'))

        if not skip_recipes:
            self.stdout.write(self.style.WARNING('\nГенерация тестовых рецептов...'))
            try:
                # Используем нашу команду generate_recipes
                call_command('generate_recipes', '--count', '15')
                self.stdout.write(self.style.SUCCESS('✓ Сгенерированы тестовые рецепты'))
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Ошибка при генерации рецептов: {e}')
                )

        # Проверяем, что данные загрузились
        from django.contrib.auth import get_user_model
        from recipes.models import Ingredient, Tag, Recipe
        
        User = get_user_model()
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('ИТОГИ ЗАГРУЗКИ:'))
        self.stdout.write(f'Загружено фикстур: {loaded_count}/3')
        self.stdout.write(f'Пользователей: {User.objects.count()}')
        self.stdout.write(f'Ингредиентов: {Ingredient.objects.count()}')
        self.stdout.write(f'Тегов: {Tag.objects.count()}')
        self.stdout.write(f'Рецептов: {Recipe.objects.count()}')
        
        if loaded_count == 3:
            self.stdout.write(self.style.SUCCESS('\n✓ Все фикстуры загружены успешно!'))
        else:
            self.stdout.write(self.style.WARNING('\n⚠ Не все фикстуры загружены'))
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('ДАННЫЕ ДЛЯ ВХОДА:'))
        
        # Показываем данные всех пользователей
        for user in User.objects.all().order_by('id'):
            role = "👑 Администратор" if user.is_superuser else "👤 Пользователь"
            self.stdout.write(f'\n{role}:')
            self.stdout.write(f'  Логин: {user.username}')
            self.stdout.write(f'  Пароль: {user.username}')  # пароль = логину
            self.stdout.write(f'  Email: {user.email}')
            
        self.stdout.write('='*50)