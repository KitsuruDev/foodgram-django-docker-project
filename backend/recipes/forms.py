from django import forms
from .models import Recipe

class RecipeForm(forms.ModelForm):
    class Meta:
        model = Recipe
        fields = ['name', 'text', 'cooking_time', 'image']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'text': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'cooking_time': forms.NumberInput(attrs={'class': 'form-control', 'min': 1}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }