from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from recipes.models import Recipe, Ingredient, Tag, RecipeIngredient
import random
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Генерирует тестовые рецепты'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Количество рецептов для генерации'
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Email пользователя, от имени которого создавать рецепты'
        )

    def handle(self, *args, **options):
        count = options['count']
        user_email = options.get('user')

        # Получаем пользователей
        users = User.objects.all()
        if not users.exists():
            self.stdout.write(self.style.ERROR('Нет пользователей в БД!'))
            self.stdout.write('Сначала выполните: python manage.py loaddata')
            return

        # Получаем ингредиенты и теги
        ingredients = list(Ingredient.objects.all())
        tags = list(Tag.objects.all())

        if not ingredients:
            self.stdout.write(self.style.ERROR('Нет ингредиентов в БД!'))
            return
        if not tags:
            self.stdout.write(self.style.ERROR('Нет тегов в БД!'))
            return

        # Рецепты для генерации
        recipe_templates = [
            {
                'name': 'Спагетти Карбонара',
                'description': 'Классический итальянский рецепт с беконом, яйцами и сыром пармезан.',
                'cooking_time': 30,
                'ingredients': ['Макароны', 'Яйца куриные', 'Сыр', 'Чеснок'],
                'tags': ['Ужин']
            },
            {
                'name': 'Омлет с овощами',
                'description': 'Легкий и полезный завтрак с овощами.',
                'cooking_time': 15,
                'ingredients': ['Яйца куриные', 'Помидоры', 'Лук репчатый', 'Масло растительное'],
                'tags': ['Завтрак', 'Вегетарианское']
            },
            {
                'name': 'Борщ классический',
                'description': 'Наваристый украинский борщ со сметаной.',
                'cooking_time': 90,
                'ingredients': ['Картофель', 'Морковь', 'Лук репчатый', 'Свекла', 'Капуста', 'Сметана'],
                'tags': ['Обед']
            },
            {
                'name': 'Пельмени домашние',
                'description': 'Тесто собственного приготовления с мясной начинкой.',
                'cooking_time': 60,
                'ingredients': ['Мука', 'Фарш мясной', 'Лук репчатый', 'Яйца куриные'],
                'tags': ['Ужин']
            },
            {
                'name': 'Плов узбекский',
                'description': 'Настоящий узбекский плов с бараниной и специями.',
                'cooking_time': 120,
                'ingredients': ['Рис', 'Морковь', 'Лук репчатый', 'Масло растительное', 'Чеснок'],
                'tags': ['Обед', 'Ужин']
            },
            {
                'name': 'Блины с малиной',
                'description': 'Тонкие блины со свежей малиной и сметаной.',
                'cooking_time': 40,
                'ingredients': ['Мука', 'Яйца куриные', 'Молоко', 'Сметана', 'Сахар'],
                'tags': ['Завтрак', 'Десерт', 'Выпечка']
            },
            {
                'name': 'Салат Цезарь',
                'description': 'Классический салат с курицей, сухариками и соусом.',
                'cooking_time': 25,
                'ingredients': ['Куриное филе', 'Сыр', 'Помидоры', 'Огурцы', 'Салат'],
                'tags': ['Обед', 'Ужин']
            },
            {
                'name': 'Гречневая каша с грибами',
                'description': 'Питательная каша с лесными грибами и луком.',
                'cooking_time': 35,
                'ingredients': ['Гречка', 'Грибы', 'Лук репчатый', 'Масло растительное'],
                'tags': ['Обед', 'Ужин', 'Вегетарианское']
            },
            {
                'name': 'Творожная запеканка',
                'description': 'Нежная запеканка с изюмом и ванилью.',
                'cooking_time': 50,
                'ingredients': ['Творог', 'Яйца куриные', 'Мука', 'Сахар', 'Сметана'],
                'tags': ['Завтрак', 'Десерт', 'Выпечка']
            },
            {
                'name': 'Куриный суп с лапшой',
                'description': 'Ароматный суп на курином бульоне с домашней лапшой.',
                'cooking_time': 60,
                'ingredients': ['Курица', 'Морковь', 'Лук репчатый', 'Лапша', 'Зелень'],
                'tags': ['Обед']
            }
        ]

        created = 0
        for i in range(count):
            # Выбираем случайный шаблон
            template = random.choice(recipe_templates)
            
            # Выбираем случайного пользователя
            if user_email:
                try:
                    author = User.objects.get(email=user_email)
                except User.DoesNotExist:
                    author = random.choice(users)
            else:
                author = random.choice(users)
            
            # Создаем рецепт
            recipe = Recipe.objects.create(
                author=author,
                name=f"{template['name']} #{i+1}",
                text=template['description'],
                cooking_time=template['cooking_time'],
            )
            
            # Добавляем теги
            tag_objects = []
            for tag_name in template['tags']:
                tag = Tag.objects.filter(name=tag_name).first()
                if tag:
                    tag_objects.append(tag)
            if tag_objects:
                recipe.tags.set(tag_objects)
            
            # Добавляем ингредиенты
            for ing_name in template['ingredients']:
                ingredient = Ingredient.objects.filter(name__icontains=ing_name).first()
                if ingredient:
                    RecipeIngredient.objects.create(
                        recipe=recipe,
                        ingredient=ingredient,
                        amount=random.randint(50, 500)
                    )
            
            # Добавляем несколько случайных ингредиентов
            extra_ingredients = random.sample(
                [ing for ing in ingredients if ing.name not in template['ingredients']],
                k=random.randint(0, 3)
            )
            for ingredient in extra_ingredients:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredient,
                    amount=random.randint(10, 200)
                )
            
            created += 1
            if i % 5 == 0:  # Прогресс каждые 5 рецептов
                self.stdout.write(f'Создано {created} из {count} рецептов...')

        self.stdout.write(self.style.SUCCESS(f'✓ Создано {created} рецептов'))
        
        # Статистика
        self.stdout.write('\n' + '='*40)
        self.stdout.write('СТАТИСТИКА:')
        for user in users:
            recipe_count = Recipe.objects.filter(author=user).count()
            if recipe_count > 0:
                self.stdout.write(f'{user.username}: {recipe_count} рецептов')
        self.stdout.write('='*40)