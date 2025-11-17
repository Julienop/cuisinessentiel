// extractors/sites/magimix.js
// Règles d'extraction spécifiques pour Magimix.fr

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis Magimix.fr
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractMagimix(root) {
    console.log('🎯 extractMagimix appelée');
    
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
    const titleElement = root.querySelector('h1, .recipe-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Temps de préparation et cuisson
    const timeInfos = root.querySelectorAll('.recipe-preparation-info');
    for (const timeInfo of timeInfos) {
        const text = timeInfo.textContent.trim();
        console.log('🕐 Info temps:', text);
        
        if (text.includes('Préparation')) {
            result.temps_preparation = extractMinutesFromText(text);
            console.log('✅ Temps préparation:', result.temps_preparation);
        } else if (text.includes('Cuisson')) {
            result.temps_cuisson = extractMinutesFromText(text);
            console.log('✅ Temps cuisson:', result.temps_cuisson);
        }
    }

    // Nombre de portions
    const portionsElement = root.querySelector('.recipe-ingredients-title');
    if (portionsElement) {
        const text = portionsElement.textContent.trim();
        result.nombre_portions = extractNumberFromText(text);
        console.log('✅ Portions:', result.nombre_portions);
    }

    // Ingrédients
    const ingredientElements = root.querySelectorAll('.recipe-ingredients-content p');
    console.log(`🔍 ${ingredientElements.length} éléments d'ingrédients trouvés`);
    
    for (const el of ingredientElements) {
        const text = el.textContent.trim();
        // Ignorer les paragraphes vides ou les séparateurs
        if (text && text.length > 2 && !text.startsWith('▸')) {
            result.ingredients.push(parseIngredientText(text));
            console.log('✅ Ingrédient ajouté:', text);
        }
    }

    // Instructions
    const stepElements = root.querySelectorAll('.recipe-step');
    console.log(`🔍 ${stepElements.length} étapes trouvées`);
    
    for (const stepEl of stepElements) {
        const titleEl = stepEl.querySelector('.recipe-step-title');
        if (titleEl) {
            const text = titleEl.textContent.trim();
            if (text && text.length > 10) {
                result.instructions.push(text);
                console.log('✅ Instruction ajoutée:', text.substring(0, 50) + '...');
            }
        }
    }

    console.log(`📊 Résultat Magimix: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 && result.instructions.length > 0 ? result : null;
}
