// recipe_form.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Специфичная логика для формы создания/редактирования рецепта

document.addEventListener('DOMContentLoaded', function() {
    console.log('RecipeForm инициализирован');

    window.formIsSubmitting = false;
    
    // Инициализируем только если есть форма рецепта
    const form = document.getElementById('recipe-form');
    if (!form) return;
    
    // Состояние
    let ingredients = [];
    
    // Загружаем ингредиенты
    loadIngredients();
    
    // Восстанавливаем сохраненные ингредиенты при редактировании
    restoreIngredients();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Настраиваем предпросмотр изображения
    setupImagePreview();
    
    // Функции
    function loadIngredients() {
        const select = document.getElementById('ingredient-select');
        if (!select) return;
        
        // Пробуем загрузить ингредиенты
        fetch('/api/ingredients/')
            .then(response => {
                if (!response.ok) {
                    // Пробуем альтернативный URL
                    return fetch('/ingredients/');
                }
                return response;
            })
            .then(response => response.json())
            .then(data => {
                const ingredientsList = data.results || data;
                if (Array.isArray(ingredientsList) && ingredientsList.length > 0) {
                    populateIngredientsSelect(ingredientsList);
                } else {
                    console.warn('Список ингредиентов пуст');
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Ингредиенты не найдены';
                    select.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки ингредиентов:', error);
                // Показываем сообщение в интерфейсе
                const container = document.getElementById('selected-ingredients');
                if (container) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'alert alert-error';
                    errorDiv.innerHTML = `
                        <p><strong>Ошибка загрузки ингредиентов:</strong></p>
                        <p>Пожалуйста, обновите страницу.</p>
                    `;
                    container.parentNode.insertBefore(errorDiv, container);
                }
            });
    }
    
    function populateIngredientsSelect(ingredientsList) {
        const select = document.getElementById('ingredient-select');
        if (!select) return;
        
        // Очищаем существующие опции
        while (select.options.length > 0) {
            select.remove(0);
        }
        
        // Добавляем опцию по умолчанию
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите ингредиент...';
        select.appendChild(defaultOption);
        
        // Добавляем все ингредиенты
        ingredientsList.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient.id;
            option.textContent = `${ingredient.name} (${ingredient.measurement_unit})`;
            option.dataset.unit = ingredient.measurement_unit;
            select.appendChild(option);
        });
        
        console.log(`Загружено ${ingredientsList.length} ингредиентов`);
    }
    
    function setupImagePreview() {
        const imageInput = document.getElementById('id_image');
        if (!imageInput) return;

        imageInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    showImagePreview(e.target.result);
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    
    function showImagePreview(imageData) {
        let previewContainer = document.getElementById('new-image-preview');
        let previewImg = document.getElementById('image-preview');
        
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'new-image-preview';
            previewContainer.className = 'new-image-preview';
            previewContainer.innerHTML = '<p>Предпросмотр нового изображения:</p>';
            
            previewImg = document.createElement('img');
            previewImg.id = 'image-preview';
            previewImg.className = 'image-preview';
            previewImg.alt = 'Preview';
            
            previewContainer.appendChild(previewImg);
            
            // Вставляем после input файла
            const fileInput = document.getElementById('id_image');
            fileInput.parentNode.appendChild(previewContainer);
        }
        
        previewImg.src = imageData;
        previewContainer.style.display = 'block';
    }
    
    function restoreIngredients() {
        try {
            // Пробуем получить из скрытого поля
            const hiddenInput = document.getElementById('initial-ingredients');
            if (hiddenInput && hiddenInput.value && hiddenInput.value !== '[]' && hiddenInput.value !== '') {
                const initialIngredients = JSON.parse(hiddenInput.value);
                if (Array.isArray(initialIngredients) && initialIngredients.length > 0) {
                    ingredients = initialIngredients;
                    updateIngredientsList();
                    updateHiddenField();
                    console.log('Восстановлено ингредиентов:', ingredients.length);
                }
            }
        } catch (error) {
            console.warn('Не удалось восстановить ингредиенты:', error);
        }
    }
    
    function setupEventListeners() {
        // Убираем старый обработчик если он есть
        const form_recipe = document.getElementById('recipe-form');
        if (form_recipe) {
            form_recipe.removeEventListener('submit', handleFormSubmit);
            form_recipe.addEventListener('submit', handleFormSubmit);
        }
        
        // Выбор ингредиента
        const ingredientSelect = document.getElementById('ingredient-select');
        if (ingredientSelect) {
            ingredientSelect.addEventListener('change', function() {
                updateMeasurementUnit(this);
            });
        }
        
        // Ввод количества - автодобавление по Enter
        const amountInput = document.getElementById('ingredient-amount');
        if (amountInput) {
            amountInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addIngredient();
                }
            });
        }
        
        // Кнопка добавления ингредиента
        const addBtn = document.querySelector('.btn-add-ingredient');
        if (addBtn) {
            addBtn.addEventListener('click', addIngredient);
        }
        
        // Обработка отправки формы
        const form = document.getElementById('recipe-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }
    
    function updateMeasurementUnit(select) {
        const selectedOption = select.options[select.selectedIndex];
        const unitSpan = document.getElementById('measurement-unit');
        
        if (unitSpan && selectedOption.dataset.unit) {
            unitSpan.textContent = selectedOption.dataset.unit;
        }
        
        // Автофокус на поле количества
        const amountInput = document.getElementById('ingredient-amount');
        if (amountInput) {
            amountInput.focus();
        }
    }
    
    function addIngredient() {
        const select = document.getElementById('ingredient-select');
        const amountInput = document.getElementById('ingredient-amount');
        
        if (!select || !amountInput) {
            console.error('Не найдены элементы формы');
            return;
        }
        
        const ingredientId = select.value;
        if (!ingredientId) {
            // Не показываем alert, просто выходим
            console.log('Ингредиент не выбран');
            return;
        }
        
        const selectedOption = select.options[select.selectedIndex];
        const ingredientName = selectedOption.textContent.split(' (')[0];
        const amount = parseFloat(amountInput.value);
        const unit = selectedOption.dataset.unit || 'ед.';
        
        // Проверка количества
        if (!amount || amount <= 0 || isNaN(amount)) {
            console.log('Некорректное количество');
            return;
        }
        
        const roundedAmount = parseFloat(amount.toFixed(2));
        
        // Проверяем, не добавлен ли уже этот ингредиент
        const existingIndex = ingredients.findIndex(item => item.id === ingredientId);
        
        if (existingIndex !== -1) {
            // Обновляем существующий без подтверждения
            ingredients[existingIndex].amount = roundedAmount;
            ingredients[existingIndex].unit = unit;
        } else {
            ingredients.push({
                id: ingredientId,
                name: ingredientName,
                amount: roundedAmount,
                unit: unit
            });
        }
        
        // Обновляем UI и данные
        updateIngredientsList();
        updateHiddenField();
        
        // Сбрасываем форму
        select.selectedIndex = 0;
        amountInput.value = '1';
        updateMeasurementUnit(select);
    }
    
    function removeIngredient(ingredientId) {
        ingredients = ingredients.filter(item => item.id !== ingredientId);
        updateIngredientsList();
        updateHiddenField();
    }
    
    function updateIngredientsList() {
        const container = document.getElementById('selected-ingredients');
        const emptyMessage = document.getElementById('empty-ingredients-message');
        
        if (!container) return;
        
        if (ingredients.length === 0) {
            if (emptyMessage) {
                emptyMessage.style.display = 'block';
            }
            container.innerHTML = '';
            return;
        }
        
        if (emptyMessage) {
            emptyMessage.style.display = 'none';
        }
        
        // Очищаем и перерисовываем контейнер
        container.innerHTML = '';
        
        ingredients.forEach((ingredient, index) => {
            const div = document.createElement('div');
            div.className = 'ingredient-item';
            div.dataset.id = ingredient.id;
            div.innerHTML = `
                <div>
                    <span class="ingredient-name">${ingredient.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span class="ingredient-amount">${ingredient.amount} ${ingredient.unit}</span>
                    <button type="button" class="btn-remove-ingredient" data-index="${index}">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
        
        // Добавляем обработчики для кнопок удаления
        container.querySelectorAll('.btn-remove-ingredient').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                if (ingredients[index]) {
                    removeIngredient(ingredients[index].id);
                }
            });
        });
    }
    
    function updateHiddenField() {
        let hiddenInput = document.getElementById('ingredients-data');
        if (!hiddenInput) {
            // Создаем скрытое поле если его нет
            const form = document.getElementById('recipe-form');
            if (form) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'ingredients_data';
                hiddenInput.id = 'ingredients-data';
                form.appendChild(hiddenInput);
            } else {
                return;
            }
        }
        
        // Формат для Django: список словарей с id и amount
        const backendFormat = ingredients.map(ingredient => ({
            id: parseInt(ingredient.id),
            amount: parseFloat(ingredient.amount)
        }));
        
        hiddenInput.value = JSON.stringify(backendFormat);
        console.log('Ингредиенты сохранены:', hiddenInput.value);
        console.log('Количество ингредиентов:', ingredients.length);
    }
    
    async function handleFormSubmit(event) {
        console.log('Form submit handler called');
        event.preventDefault(); // ВСЕГДА предотвращаем стандартную отправку
        
        // Обновляем скрытое поле
        updateHiddenField();
        
        const hiddenInput = document.getElementById('ingredients-data');
        console.log('Скрытое поле value:', hiddenInput ? hiddenInput.value : 'не найден');
        
        // Проверяем ингредиенты в скрытом поле
        let ingredientsData = [];
        if (hiddenInput && hiddenInput.value && hiddenInput.value !== '[]' && hiddenInput.value !== '') {
            try {
                ingredientsData = JSON.parse(hiddenInput.value);
                console.log('Ингредиенты для отправки:', ingredientsData);
            } catch (e) {
                console.error('Ошибка парсинга JSON:', e);
                alert('Ошибка формата ингредиентов. Попробуйте еще раз.');
                return;
            }
        }
        
        if (!Array.isArray(ingredientsData) || ingredientsData.length === 0) {
            alert('Добавьте хотя бы один ингредиент!');
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = event.target.querySelector('[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Сохранение...';
        }
        
        try {
            // Собираем данные формы
            const form = event.target;
            const formData = new FormData(form);
            
            // Добавляем ингредиенты в правильном формате
            // Django обычно ожидает формат: ingredients: [{"id": 1, "amount": 100}, ...]
            ingredientsData.forEach((ingredient, index) => {
                formData.append(`ingredients[${index}][id]`, ingredient.id);
                formData.append(`ingredients[${index}][amount]`, ingredient.amount);
            });
            
            console.log('Отправка данных формы...');
            
            // Отправляем форму через fetch
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            
            // Проверяем ответ
            if (response.ok) {
                // Если ответ успешный, проверяем редирект
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    console.log('Успешный ответ JSON:', data);
                    
                    // Редирект если есть в ответе
                    if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                        return;
                    }
                }
                
                // Если не JSON, пробуем получить URL редиректа из заголовков или формы
                const redirectUrl = response.headers.get('Location') || form.dataset.redirect;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    // Если нет редиректа, переходим на главную
                    window.location.href = '/';
                }
                
            } else {
                // Обработка ошибок
                const contentType = response.headers.get('content-type');
                let errorMessage = 'Ошибка при сохранении рецепта';
                
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                    console.error('Ошибка сервера:', errorData);
                } else {
                    const text = await response.text();
                    console.error('Ошибка сервера (не JSON):', text.substring(0, 200));
                }
                
                alert(errorMessage);
                
                // Восстанавливаем кнопку
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
            
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);
            alert('Сетевая ошибка: ' + error.message);
            
            // Восстанавливаем кнопку
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    // Функция для получения CSRF токена
    function getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 10) === ('csrftoken' + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        return cookieValue;
    }
});