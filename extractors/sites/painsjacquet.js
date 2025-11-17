// extractors/sites/painsjacquet.js
// Règles d'extraction spécifiques pour Painsjacquet.com

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis Painsjacquet.com
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractPainsjacquet(root) {
    console.log('🎯 extractPainsjacquet appelée');
    
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

    // Ingrédients - chercher dans plusieurs patterns
    const ingredientSelectors = [
        '.ingredients li',
        '[class*="ingredient"] li',
        'ul li',
    ];

    for (const selector of ingredientSelectors) {
        const ingredientElements = root.querySelectorAll(selector);
        if (ingredientElements.length >= 2) {
            console.log(`🔍 ${ingredientElements.length} ingrédients candidats avec ${selector}`);
            for (const el of ingredientElements) {
                const text = el.textContent.trim();
                // Filtrer les instructions qui seraient dans des <li>
                if (text && text.length > 3 && !text.match(/^\d+\./)) {
                    result.ingredients.push(parseIngredientText(text));
                }
            }
            if (result.ingredients.length >= 2) break;
        }
    }

    // Instructions - numérotées "01.", "02.", "03."
    // Chercher tous les éléments contenant du texte numéroté
    const allElements = root.querySelectorAll('p, div, li');
    const numberedInstructions = [];

    for (const el of allElements) {
        const text = el.textContent.trim();
        // Détecter les numéros au début : "01.", "02.", "1.", "2.", etc.
        const match = text.match(/^(\d{1,2})\.\s*(.+)/);
        if (match && match[2].length > 15) {
            numberedInstructions.push({
                number: parseInt(match[1]),
                text: match[2].trim()
            });
        }
    }

    // Trier par numéro et ajouter
    if (numberedInstructions.length >= 2) {
        numberedInstructions.sort((a, b) => a.number - b.number);
        result.instructions = numberedInstructions.map(item => item.text);
        console.log(`✅ ${result.instructions.length} instructions numérotées trouvées`);
    }

    // Temps et portions
    const timeElements = root.querySelectorAll('[class*="time"], .recipe-info');
    for (const el of timeElements) {
        const text = el.textContent;
        if (text.includes('min') || text.includes('heure')) {
            const minutes = extractMinutesFromText(text);
            if (minutes) {
                if (text.toLowerCase().includes('préparation')) {
                    result.temps_preparation = minutes;
                } else if (text.toLowerCase().includes('cuisson')) {
                    result.temps_cuisson = minutes;
                }
            }
        }
    }

    const portionsElement = root.querySelector('[class*="portion"], [class*="serving"]');
    if (portionsElement) {
        result.nombre_portions = extractNumberFromText(portionsElement.textContent);
    }

    console.log(`📊 Résultat Painsjacquet: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 && result.instructions.length > 0 ? result : null;
}
