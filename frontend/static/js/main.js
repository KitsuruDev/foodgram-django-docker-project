// Общие функции для работы с API и обработки событий

const Foodgram = {
    // Конфигурация
    config: {
        // Берем базовый URL из data-атрибута или вычисляем
        API_BASE_URL: document.body.dataset.apiBaseUrl || (window.location.origin + '/api'),
        CSRF_TOKEN: null
    },

    // Инициализация
    init: function() {
        console.log('Foodgram JS инициализирован');
        this.config.CSRF_TOKEN = this.getCookie('csrftoken');
        
        // Если нет data-атрибута, устанавливаем его
        if (!document.body.dataset.apiBaseUrl) {
            document.body.dataset.apiBaseUrl = this.config.API_BASE_URL;
        }
        
        this.setupEventListeners();
        this.setupGlobalHandlers();
    },

    // Получение CSRF токена
    getCookie: function(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    },

    // Общий запрос к API
    apiRequest: async function(endpoint, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.config.CSRF_TOKEN
        };

        // Если есть токен авторизации, добавляем его
        const token = localStorage.getItem('token');
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const headers = { ...defaultHeaders, ...options.headers };
        
        // Убираем дублирующиеся слеши в URL
        let url = this.config.API_BASE_URL;
        if (url.endsWith('/') && endpoint.startsWith('/')) {
            url = url.slice(0, -1);
        }
        url = url + endpoint;
        
        console.log('API Request to:', url);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Не авторизован - редирект на логин
                window.location.href = '/auth/login/?next=' + encodeURIComponent(window.location.pathname);
                throw new Error('Требуется авторизация');
            }

            // Проверяем Content-Type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Если не JSON, пробуем прочитать как текст
                const text = await response.text();
                console.warn('Non-JSON response:', text.substring(0, 200));
                
                if (response.ok) {
                    // Если ответ успешный, но не JSON, возвращаем текст
                    return { success: true, data: text };
                } else {
                    throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
                }
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
            }

            // Для DELETE запросов может не быть тела
            if (response.status === 204 || options.method === 'DELETE') {
                return { success: true };
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    },

    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Обработчики для кнопок избранного
        document.addEventListener('click', (e) => {
            const favoriteBtn = e.target.closest('.favorite-btn');
            const shoppingBtn = e.target.closest('.shopping-btn');
            const subscribeBtn = e.target.closest('.subscribe-btn');

            if (favoriteBtn) {
                e.preventDefault();
                this.handleFavoriteClick(favoriteBtn);
            }

            if (shoppingBtn) {
                e.preventDefault();
                this.handleShoppingCartClick(shoppingBtn);
            }

            if (subscribeBtn) {
                e.preventDefault();
                this.handleSubscribeClick(subscribeBtn);
            }
        });

        // Обработка форм с предотвращением стандартной отправки
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.classList.contains('ajax-form')) {
                e.preventDefault();
                this.handleAjaxFormSubmit(form);
            }
        });
    },

    // Глобальные обработчики
    setupGlobalHandlers: function() {
        // Обработка ссылок с подтверждением
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[data-confirm]')) {
                const message = e.target.getAttribute('data-confirm');
                if (!confirm(message)) {
                    e.preventDefault();
                }
            }
        });

        // Показать/скрыть пароль
        document.addEventListener('click', (e) => {
            if (e.target.matches('.toggle-password')) {
                const input = e.target.previousElementSibling;
                if (input.type === 'password') {
                    input.type = 'text';
                    e.target.textContent = '🙈';
                } else {
                    input.type = 'password';
                    e.target.textContent = '👁️';
                }
            }
        });
    },

    // Обработка избранного
    handleFavoriteClick: async function(button) {
        const recipeId = button.dataset.recipeId;
        const isFavorited = button.classList.contains('active') || button.textContent.includes('★');

        try {
            if (isFavorited) {
                await this.apiRequest(`/recipes/${recipeId}/favorite/`, {
                    method: 'DELETE'
                });
                button.classList.remove('active');
                button.innerHTML = button.innerHTML.replace('★', '☆').replace('Убрать из избранного', 'В избранное');
                this.showNotification('Рецепт удален из избранного', 'success');
            } else {
                await this.apiRequest(`/recipes/${recipeId}/favorite/`, {
                    method: 'POST'
                });
                button.classList.add('active');
                button.innerHTML = button.innerHTML.replace('☆', '★').replace('В избранное', 'Убрать из избранного');
                this.showNotification('Рецепт добавлен в избранное', 'success');
            }
        } catch (error) {
            console.error('Favorite error:', error);
        }
    },

    // Обработка списка покупок
    handleShoppingCartClick: async function(button) {
        const recipeId = button.dataset.recipeId;
        const isInCart = button.classList.contains('active') || button.textContent.includes('✓');

        try {
            if (isInCart) {
                await this.apiRequest(`/recipes/${recipeId}/shopping_cart/`, {
                    method: 'DELETE'
                });
                button.classList.remove('active');
                button.innerHTML = button.innerHTML.replace('✓', '＋').replace('В списке', 'В покупки');
                this.showNotification('Рецепт удален из списка покупок', 'success');
            } else {
                await this.apiRequest(`/recipes/${recipeId}/shopping_cart/`, {
                    method: 'POST'
                });
                button.classList.add('active');
                button.innerHTML = button.innerHTML.replace('＋', '✓').replace('В покупки', 'В списке');
                this.showNotification('Рецепт добавлен в список покупок', 'success');
            }
        } catch (error) {
            console.error('Shopping cart error:', error);
        }
    },

    // Обработка подписок
    handleSubscribeClick: async function(button) {
        const authorId = button.dataset.authorId;
        const isSubscribed = button.classList.contains('active') || button.textContent.includes('✓');

        try {
            if (isSubscribed) {
                await this.apiRequest(`/users/${authorId}/subscribe/`, {
                    method: 'DELETE'
                });
                button.classList.remove('active');
                button.textContent = '＋ Подписаться';
                this.showNotification('Вы отписались от автора', 'info');
            } else {
                await this.apiRequest(`/users/${authorId}/subscribe/`, {
                    method: 'POST'
                });
                button.classList.add('active');
                button.textContent = '✓ Подписан';
                this.showNotification('Вы подписались на автора', 'success');
            }
        } catch (error) {
            console.error('Subscribe error:', error);
        }
    },

    // Обработка AJAX форм
    handleAjaxFormSubmit: async function(form) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';

        // Показываем индикатор загрузки
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Обработка...';
        }

        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'X-CSRFToken': this.config.CSRF_TOKEN
                }
            });

            // Проверяем Content-Type
            const contentType = response.headers.get('content-type');
            
            if (response.ok) {
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    this.showNotification('Данные сохранены успешно!', 'success');
                    
                    // Редирект если указан
                    if (data.redirect_url) {
                        setTimeout(() => {
                            window.location.href = data.redirect_url;
                        }, 1500);
                    } else if (form.dataset.redirect) {
                        setTimeout(() => {
                            window.location.href = form.dataset.redirect;
                        }, 1500);
                    }
                } else {
                    // Если ответ не JSON, но успешный - редирект по умолчанию
                    this.showNotification('Данные сохранены успешно!', 'success');
                    setTimeout(() => {
                        if (form.dataset.redirect) {
                            window.location.href = form.dataset.redirect;
                        } else {
                            window.location.href = '/';
                        }
                    }, 1500);
                }
            } else {
                // Пробуем прочитать ошибку
                let errorMessage = 'Ошибка при сохранении';
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || errorMessage;
                } else {
                    const text = await response.text();
                    console.error('Non-JSON error response:', text.substring(0, 200));
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            // Восстанавливаем кнопку
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    },

    // Показать уведомление
    showNotification: function(message, type = 'info') {
        // Создаем контейнер если его нет
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 350px;
            `;
            document.body.appendChild(container);
        }

        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
        `;

        container.appendChild(notification);

        // Обработчик закрытия
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });

        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    },

    // Скачать список покупок
    downloadShoppingList: async function(format = 'txt') {
        try {
            const response = await fetch(`${this.config.API_BASE_URL}/recipes/download_shopping_cart/?format=${format}`, {
                headers: {
                    'X-CSRFToken': this.config.CSRF_TOKEN
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки файла');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shopping_list.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Список покупок скачан', 'success');
        } catch (error) {
            this.showNotification('Ошибка при скачивании: ' + error.message, 'error');
        }
    },

    // Очистить список покупок
    clearShoppingList: async function() {
        if (!confirm('Вы уверены, что хотите очистить весь список покупок?')) {
            return;
        }

        try {
            await this.apiRequest('/shopping_cart/clear/', {
                method: 'DELETE'
            });
            this.showNotification('Список покупок очищен', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            this.showNotification('Ошибка при очистке списка', 'error');
        }
    },

    // Удалить рецепт из списка покупок
    removeRecipeFromShoppingList: async function(recipeId) {
        try {
            await this.apiRequest(`/shopping_cart/remove/?recipe_id=${recipeId}`, {
                method: 'DELETE'
            });
            this.showNotification('Рецепт удален из списка', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            this.showNotification('Ошибка при удалении рецепта', 'error');
        }
    },

    // Копировать ссылку
    copyToClipboard: function(text, elementId = 'copy-message') {
        navigator.clipboard.writeText(text).then(() => {
            const message = document.getElementById(elementId);
            if (message) {
                message.style.display = 'inline';
                setTimeout(() => {
                    message.style.display = 'none';
                }, 2000);
            } else {
                this.showNotification('Ссылка скопирована в буфер обмена', 'success');
            }
        }).catch(err => {
            this.showNotification('Не удалось скопировать ссылку', 'error');
        });
    },

    // Переключение вкладок
    setupTabs: function(containerSelector = '.tab-content') {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.dataset.tab;
                const container = this.closest(containerSelector) ? this.closest(containerSelector).parentElement : document;
                
                // Удаляем active у всех кнопок и панелей
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                // Добавляем active текущим элементам
                this.classList.add('active');
                const pane = document.getElementById(`tab-${tabId}`);
                if (pane) {
                    pane.classList.add('active');
                }
            });
        });
    }
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    Foodgram.init();
    
    // Настраиваем вкладки если есть
    if (document.querySelector('.tab-btn')) {
        Foodgram.setupTabs();
    }
    
    // Добавляем стили для анимаций уведомлений
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
});

// Экспортируем глобально для использования в других файлах
window.Foodgram = Foodgram;