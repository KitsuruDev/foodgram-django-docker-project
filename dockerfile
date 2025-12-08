FROM nginx:1.21-alpine

# Копируем статические файлы
COPY frontend/static/ /static/
COPY frontend/templates/ /usr/share/nginx/html/

# Копируем конфигурацию nginx для фронтенда
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80