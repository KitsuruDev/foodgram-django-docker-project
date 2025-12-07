# Локальная сборка и запуск проекта:

1. Клонировать проект **git clone https://github.com/KitsuruDev/foodgram-django-docker-project.git**;

2. Перейти в директорию **/backend/** и собрать базу данных командой **python ./manage.py migrate**

3. Собрать все файлы фронтенда проекта для их работы с бекендом командой **python ./manage.py collectstatic --no-input**

4. Запустить проект **python ./manage.py runserver**


# Заполнить базу данных тестовыми данными (перед заполнением будет произведена автоматическая очистка БД):

**python ./manage.py load_data**


# Очистить базу данных:

**python ./manage.py clear_data**