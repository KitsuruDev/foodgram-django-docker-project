from django import forms
from .models import Recipe, Tag, Ingredient

class RecipeForm(forms.ModelForm):
    class Meta:
        model = Recipe
        fields = ['name', 'text', 'image', 'cooking_time', 'tags']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Название рецепта'
            }),
            'text': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 4,
                'placeholder': 'Описание рецепта'
            }),
            'cooking_time': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1
            }),
            'image': forms.FileInput(attrs={
                'class': 'form-control'
            }),
            'tags': forms.CheckboxSelectMultiple()
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['tags'].queryset = Tag.objects.all()