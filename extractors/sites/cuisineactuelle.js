// extractors/sites/cuisineactuelle.js
// Règles d'extraction spécifiques pour CuisineActuelle.fr

import { parseIngredientText } from '../utils.js';

/**
 * Extrait une recette depuis CuisineActuelle.fr
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractCuisineActuelle(root) {
    console.log('🎯 extractCuisineActuelle appelée');
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // Titre
    const titleElement = root.querySelector('.recipe-header h1, h1.title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Ingrédients
    const ingredientElements = root.querySelectorAll('.ingredient-list li, .recipe-ingredient');
    console.log(`🔍 ${ingredientElements.length} éléments d'ingrédients trouvés`);
    
    for (const el of ingredientElements) {
        const text = el.textContent.trim();
        if (text) {
            result.ingredients.push(parseIngredientText(text));
            console.log(`✅ Ingrédient: ${text}`);
        }
    }

    // Instructions
    const instructionElements = root.querySelectorAll('.recipe-steps li, .preparation-step');
    console.log(`🔍 ${instructionElements.length} éléments d'instructions trouvés`);
    
    for (const el of instructionElements) {
        const textEl = el.querySelector('p, .step-text');
        const text = textEl ? textEl.textContent.trim() : el.textContent.trim();
        if (text && text.length > 10) {
            result.instructions.push(text);
            console.log(`✅ Instruction: ${text.substring(0, 50)}...`);
        }
    }

    console.log(`📊 Résultat CuisineActuelle: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 ? result : null;
}
