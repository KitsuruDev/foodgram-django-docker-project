from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from django.db.migrations.recorder import MigrationRecorder

User = get_user_model()


class Command(BaseCommand):
    help = 'Очищает данные из базы данных, но сохраняет структуру таблиц'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пропустить подтверждение',
        )
        parser.add_argument(
            '--keep-users',
            action='store_true',
            help='Сохранить пользователей',
        )

    def handle(self, *args, **options):
        force = options['force']
        keep_users = options['keep_users']
        
        if not force:
            message = 'ВНИМАНИЕ! Вы собираетесь удалить данные из базы.\n'
            if not keep_users:
                message += 'Будут удалены ВСЕ пользователи (включая суперпользователей).\n'
            message += 'Будут удалены все рецепты, ингредиенты, связи.\n'
            message += 'Это действие НЕЛЬЗЯ отменить! Продолжить? (yes/no): '
            
            confirm = input(message)
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Отменено'))
                return

        # Сохраняем запись о миграциях
        self.stdout.write(self.style.WARNING('Сохраняем информацию о миграциях...'))
        
        # Получаем текущие миграции
        with connection.cursor() as cursor:
            cursor.execute("SELECT app, name FROM django_migrations;")
            migrations = cursor.fetchall()
        
        # Получаем список всех таблиц
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [table[0] for table in cursor.fetchall()]
            
            self.stdout.write(self.style.WARNING(f'Найдено таблиц: {len(tables)}'))
            
            # Отключаем foreign key constraints
            cursor.execute("PRAGMA foreign_keys = OFF;")
            
            # Удаляем данные из таблиц (кроме системных)
            system_tables = [
                'django_migrations',      # Сохраняем миграции!
                'django_content_type',    # Сохраняем типы контента
                'auth_permission',        # Сохраняем разрешения
                'django_admin_log',       # Можно очистить
                'sqlite_sequence',        # Сбрасываем автоинкремент
            ]
            
            user_tables = ['users_user', 'auth_user'] if keep_users else []
            
            tables_to_preserve = system_tables + user_tables
            
            for table in tables:
                if table in tables_to_preserve:
                    if table == 'django_admin_log':
                        cursor.execute(f"DELETE FROM {table};")
                        self.stdout.write(f"Очищена таблица: {table}")
                    continue
                
                cursor.execute(f"DELETE FROM {table};")
                self.stdout.write(f"Очищена таблица: {table}")
            
            # Сбрасываем автоинкремент для очищенных таблиц
            for table in tables:
                if table not in tables_to_preserve:
                    cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}';")
            
            # Включаем foreign key constraints обратно
            cursor.execute("PRAGMA foreign_keys = ON;")
        
        self.stdout.write(self.style.SUCCESS('✓ Данные очищены, структура таблиц сохранена!'))
        
        # Показываем статистику
        self.show_statistics(keep_users)

    def show_statistics(self, keep_users):
        """Показывает статистику после очистки"""
        try:
            from django.contrib.auth import get_user_model
            from recipes.models import Recipe, Ingredient, Tag
            
            User = get_user_model()
            
            self.stdout.write('\n' + '='*50)
            self.stdout.write(self.style.SUCCESS('СТАТИСТИКА ПОСЛЕ ОЧИСТКИ:'))
            self.stdout.write(f'Пользователей: {User.objects.count()}')
            self.stdout.write(f'Рецептов: {Recipe.objects.count()}')
            self.stdout.write(f'Ингредиентов: {Ingredient.objects.count()}')
            self.stdout.write(f'Тегов: {Tag.objects.count()}')
            
            if keep_users:
                self.stdout.write('\n' + self.style.WARNING('Пользователи сохранены!'))
            else:
                # Создаем минимального суперпользователя для админки
                if User.objects.count() == 0:
                    self.stdout.write('\n' + self.style.WARNING('Нет пользователей!'))
                    self.stdout.write('Создайте суперпользователя командой:')
                    self.stdout.write('python manage.py createsuperuser')
            
            self.stdout.write('='*50)
            
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Не удалось получить статистику: {e}'))