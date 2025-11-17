// extractors/sites/jow.js
// Règles d'extraction spécifiques pour Jow.fr

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis Jow.fr
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractJow(root) {
    console.log('🎯 extractJow appelée');
    
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
    const titleElement = root.querySelector('h1, .recipe-title, [class*="title"]');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Ingrédients - chercher dans plusieurs patterns possibles
    const ingredientSelectors = [
        '[class*="ingredient"] li',
        '.ingredients li',
        '[class*="Ingredient"] li',
    ];

    for (const selector of ingredientSelectors) {
        const ingredientElements = root.querySelectorAll(selector);
        if (ingredientElements.length >= 2) {
            console.log(`🔍 ${ingredientElements.length} ingrédients trouvés avec ${selector}`);
            for (const el of ingredientElements) {
                const text = el.textContent.trim();
                if (text && text.length > 2) {
                    result.ingredients.push(parseIngredientText(text));
                }
            }
            if (result.ingredients.length >= 2) break;
        }
    }

    // Instructions - chercher les "Étape X"
    const instructionSelectors = [
        '[class*="step"]',
        '[class*="Step"]',
        '[class*="instruction"]',
        '.recipe-steps li',
        'ol li',
    ];

    for (const selector of instructionSelectors) {
        const instructionElements = root.querySelectorAll(selector);
        if (instructionElements.length >= 2) {
            console.log(`🔍 ${instructionElements.length} instructions trouvées avec ${selector}`);
            for (const el of instructionElements) {
                const text = el.textContent.trim();
                // Nettoyer "Étape 1", "Étape 2", etc.
                const cleanedText = text.replace(/^Étape\s*\d+\s*/i, '').trim();
                if (cleanedText && cleanedText.length > 10) {
                    result.instructions.push(cleanedText);
                }
            }
            if (result.instructions.length >= 2) break;
        }
    }

    // Temps et portions
    const timeElements = root.querySelectorAll('[class*="time"], [class*="Time"]');
    for (const el of timeElements) {
        const text = el.textContent.toLowerCase();
        if (text.includes('préparation')) {
            result.temps_preparation = extractMinutesFromText(text);
        } else if (text.includes('cuisson')) {
            result.temps_cuisson = extractMinutesFromText(text);
        }
    }

    const portionsElement = root.querySelector('[class*="portion"], [class*="serving"]');
    if (portionsElement) {
        result.nombre_portions = extractNumberFromText(portionsElement.textContent);
    }

    console.log(`📊 Résultat Jow: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 && result.instructions.length > 0 ? result : null;
}
