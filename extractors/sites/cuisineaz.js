// extractors/sites/cuisineaz.js
// Règles d'extraction spécifiques pour CuisineAZ.com

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis CuisineAZ.com
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractCuisineAZ(root) {
    console.log('🎯 extractCuisineAZ appelée');
    
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
    const titleElement = root.querySelector('h1.recipe-title, .main-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Ingrédients
    const ingredientElements = root.querySelectorAll('.ingredients-list li, .ingredient');
    console.log(`🔍 ${ingredientElements.length} éléments d'ingrédients trouvés`);
    
    for (const el of ingredientElements) {
        const text = el.textContent.trim();
        if (text) {
            result.ingredients.push(parseIngredientText(text));
            console.log(`✅ Ingrédient: ${text}`);
        }
    }

    // Instructions
    const instructionElements = root.querySelectorAll('.recipe-steps li, .step-item');
    console.log(`🔍 ${instructionElements.length} éléments d'instructions trouvés`);
    
    for (const el of instructionElements) {
        const textEl = el.querySelector('.step-description, p');
        const text = textEl ? textEl.textContent.trim() : el.textContent.trim();
        if (text && text.length > 10) {
            result.instructions.push(text);
            console.log(`✅ Instruction: ${text.substring(0, 50)}...`);
        }
    }

    // Métadonnées (temps et portions)
    const timeElements = root.querySelectorAll('.recipe-times span');
    for (const el of timeElements) {
        const labelEl = el.querySelector('.label');
        const valueEl = el.querySelector('.value');
        
        if (labelEl && valueEl) {
            const label = labelEl.textContent.toLowerCase();
            const value = valueEl.textContent;

            if (label.includes('préparation')) {
                result.temps_preparation = extractMinutesFromText(value);
                console.log('✅ Temps préparation:', result.temps_preparation);
            } else if (label.includes('cuisson')) {
                result.temps_cuisson = extractMinutesFromText(value);
                console.log('✅ Temps cuisson:', result.temps_cuisson);
            }
        }
    }

    // Portions
    const servingsEl = root.querySelector('.recipe-servings, .portions');
    if (servingsEl) {
        const servings = servingsEl.textContent;
        result.nombre_portions = extractNumberFromText(servings);
        console.log('✅ Portions:', result.nombre_portions);
    }

    console.log(`📊 Résultat CuisineAZ: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 ? result : null;
}
