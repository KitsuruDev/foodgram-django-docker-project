from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Полностью очищает базу данных (ВСЁ, включая суперпользователей)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пропустить подтверждение',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        if not force:
            confirm = input(
                'ВНИМАНИЕ! Вы собираетесь удалить ВСЕ данные из базы.\n'
                'Будут удалены все пользователи, рецепты, ингредиенты.\n'
                'Это действие НЕЛЬЗЯ отменить! Продолжить? (yes/no): '
            )
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Отменено'))
                return

        # Получаем список всех таблиц
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            # Отключаем foreign key constraints
            cursor.execute("PRAGMA foreign_keys = OFF;")
            
            # Удаляем все таблицы (кроме sqlite_sequence)
            for table in tables:
                table_name = table[0]
                if table_name != 'sqlite_sequence':
                    cursor.execute(f"DELETE FROM {table_name};")
                    cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}';")
                    self.stdout.write(f"Очищена таблица: {table_name}")
            
            # Включаем foreign key constraints обратно
            cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Очищаем кэш ContentType
        ContentType.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('База данных ПОЛНОСТЬЮ очищена!'))
        self.stdout.write('Все таблицы опустошены, включая пользователей.')