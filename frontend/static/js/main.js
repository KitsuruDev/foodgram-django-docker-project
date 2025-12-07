// Базовая конфигурация для работы с API
const API_BASE_URL = window.location.origin + '/api';

// Общая функция для API запросов с токеном
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
}

// Управление избранным
document.addEventListener('DOMContentLoaded', function() {
    // Кнопки избранного
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const recipeId = this.dataset.recipeId;
            const isFavorited = this.textContent.includes('★');
            
            try {
                if (isFavorited) {
                    // Удалить из избранного
                    await apiRequest(`/recipes/${recipeId}/favorite/`, {
                        method: 'DELETE'
                    });
                    this.textContent = '☆ В избранное';
                } else {
                    // Добавить в избранное
                    await apiRequest(`/recipes/${recipeId}/favorite/`, {
                        method: 'POST'
                    });
                    this.textContent = '★ Убрать из избранного';
                }
            } catch (error) {
                if (error.message.includes('401')) {
                    window.location.href = '/auth/login/';
                } else {
                    alert('Ошибка: ' + error.message);
                }
            }
        });
    });
    
    // Кнопки списка покупок
    document.querySelectorAll('.shopping-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const recipeId = this.dataset.recipeId;
            const isInCart = this.textContent.includes('✓');
            
            try {
                if (isInCart) {
                    // Удалить из списка покупок
                    await apiRequest(`/recipes/${recipeId}/shopping_cart/`, {
                        method: 'DELETE'
                    });
                    this.textContent = '＋ В покупки';
                } else {
                    // Добавить в список покупок
                    await apiRequest(`/recipes/${recipeId}/shopping_cart/`, {
                        method: 'POST'
                    });
                    this.textContent = '✓ В списке';
                }
            } catch (error) {
                if (error.message.includes('401')) {
                    window.location.href = '/auth/login/';
                } else {
                    alert('Ошибка: ' + error.message);
                }
            }
        });
    });
    
    // Кнопка подписки на автора
    document.querySelectorAll('.subscribe-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const authorId = this.dataset.authorId;
            const isSubscribed = this.textContent.includes('✓');
            
            try {
                if (isSubscribed) {
                    // Отписаться
                    await apiRequest(`/users/${authorId}/subscribe/`, {
                        method: 'DELETE'
                    });
                    this.textContent = '＋ Подписаться';
                } else {
                    // Подписаться
                    await apiRequest(`/users/${authorId}/subscribe/`, {
                        method: 'POST'
                    });
                    this.textContent = '✓ Подписан';
                }
            } catch (error) {
                if (error.message.includes('401')) {
                    window.location.href = '/auth/login/';
                } else {
                    alert('Ошибка: ' + error.message);
                }
            }
        });
    });
});

// Скачивание списка покупок
async function downloadShoppingList(format = 'txt') {
    try {
        const response = await fetch(`${API_BASE_URL}/recipes/download_shopping_cart/?format=${format}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    } catch (error) {
        alert('Ошибка при скачивании списка: ' + error.message);
    }
}