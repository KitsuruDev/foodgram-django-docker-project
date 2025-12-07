document.addEventListener('DOMContentLoaded', function() {
    // Загружаем список ингредиентов
    loadIngredients();
    
    // Восстанавливаем сохраненные ингредиенты при редактировании
    restoreIngredients();
    
    // Обработка отправки формы
    const form = document.getElementById('recipe-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            prepareFormData();
        });
    }
});

let ingredientsList = [];

async function loadIngredients() {
    try {
        const response = await fetch('/api/ingredients/');
        const data = await response.json();
        
        const select = document.getElementById('ingredient-select');
        data.results.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient.id;
            option.textContent = `${ingredient.name} (${ingredient.measurement_unit})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки ингредиентов:', error);
    }
}

function addIngredient() {
    const select = document.getElementById('ingredient-select');
    const amountInput = document.getElementById('ingredient-amount');
    
    const ingredientId = select.value;
    const amount = parseFloat(amountInput.value);
    
    if (!ingredientId || !amount || amount <= 0) {
        alert('Пожалуйста, выберите ингредиент и укажите количество');
        return;
    }
    
    const ingredientText = select.options[select.selectedIndex].text;
    const ingredientName = ingredientText.split(' (')[0];
    const measurementUnit = ingredientText.match(/\(([^)]+)\)/)[1];
    
    // Проверяем, не добавлен ли уже этот ингредиент
    if (ingredientsList.some(item => item.id === ingredientId)) {
        alert('Этот ингредиент уже добавлен');
        return;
    }
    
    ingredientsList.push({
        id: ingredientId,
        name: ingredientName,
        amount: amount,
        measurement_unit: measurementUnit
    });
    
    updateSelectedIngredients();
    
    // Сбрасываем поля
    select.value = '';
    amountInput.value = '';
}

function updateSelectedIngredients() {
    const container = document.getElementById('selected-ingredients');
    container.innerHTML = '';
    
    ingredientsList.forEach((ingredient, index) => {
        const div = document.createElement('div');
        div.className = 'selected-ingredient';
        div.innerHTML = `
            <span>${ingredient.name} - ${ingredient.amount} ${ingredient.measurement_unit}</span>
            <button type="button" class="btn-remove-ingredient" onclick="removeIngredient(${index})">×</button>
            <input type="hidden" name="ingredients[${index}][id]" value="${ingredient.id}">
            <input type="hidden" name="ingredients[${index}][amount]" value="${ingredient.amount}">
        `;
        container.appendChild(div);
    });
}

function removeIngredient(index) {
    ingredientsList.splice(index, 1);
    updateSelectedIngredients();
}

function restoreIngredients() {
    // В реальном приложении здесь бы восстанавливались ингредиенты из редактируемого рецепта
    // Это нужно для страницы редактирования рецепта
    const initialIngredients = JSON.parse(document.getElementById('initial-ingredients')?.value || '[]');
    if (initialIngredients.length > 0) {
        ingredientsList = initialIngredients;
        updateSelectedIngredients();
    }
}

function prepareFormData() {
    const form = document.getElementById('recipe-form');
    const formData = new FormData(form);
    
    // Добавляем ингредиенты в специальном формате
    ingredientsList.forEach((ingredient, index) => {
        formData.append(`ingredients[${index}][id]`, ingredient.id);
        formData.append(`ingredients[${index}][amount]`, ingredient.amount);
    });
    
    // Отправляем форму
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Ошибка сохранения рецепта');
    })
    .then(data => {
        window.location.href = `/recipes/${data.id}/`;
    })
    .catch(error => {
        alert('Ошибка: ' + error.message);
    });
}

function getCookie(name) {
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
}