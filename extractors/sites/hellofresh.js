// extractors/sites/hellofresh.js
// Règles d'extraction spécifiques pour hellofresh.fr

import { parseIngredientText, extractMinutesFromText } from '../utils.js';

/**
 * Extrait une recette depuis hellofresh.fr
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractHelloFresh(root) {
    console.log('🎯 extractHelloFresh appelée');
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // ===== TEMPS (spécifique HelloFresh) =====
    // HelloFresh affiche les temps dans des spans avec data-translation-id
    
    // Chercher "Temps total" : <span data-translation-id="recipe-detail.preparation-time">
    const totalTimeSpan = root.querySelector('[data-translation-id="recipe-detail.preparation-time"]');
    let totalTime = null;
    if (totalTimeSpan) {
        const nextSpan = totalTimeSpan.nextElementSibling;
        if (nextSpan) {
            const text = nextSpan.textContent;
            totalTime = extractMinutesFromText(text);
            console.log(`✅ Temps total trouvé: ${totalTime} min`);
        }
    }
    
    // Chercher "Temps de préparation" : <span data-translation-id="recipe-detail.cooking-time">
    const prepTimeSpan = root.querySelector('[data-translation-id="recipe-detail.cooking-time"]');
    let prepTime = null;
    if (prepTimeSpan) {
        const nextSpan = prepTimeSpan.nextElementSibling;
        if (nextSpan) {
            const text = nextSpan.textContent;
            prepTime = extractMinutesFromText(text);
            console.log(`✅ Temps de préparation trouvé: ${prepTime} min`);
        }
    }
    
    // Calculer le temps de cuisson
    if (totalTime && prepTime) {
        result.temps_preparation = prepTime;
        result.temps_cuisson = Math.max(0, totalTime - prepTime);
        console.log(`⚙️ Temps cuisson calculé: ${result.temps_cuisson} min (${totalTime} - ${prepTime})`);
    } else if (totalTime) {
        // Si on a seulement le temps total, le mettre en préparation
        result.temps_preparation = totalTime;
        console.log(`⚙️ Seulement temps total disponible: ${totalTime} min`);
    }

    // On retourne les temps uniquement (le reste sera géré par Schema.org)
    // Retourner null si aucun temps trouvé
    if (!result.temps_preparation && !result.temps_cuisson) {
        console.log('⚠️ Aucun temps trouvé dans HelloFresh HTML');
        return null;
    }

    console.log(`📊 Résultat HelloFresh: prep=${result.temps_preparation}, cuisson=${result.temps_cuisson}`);
    return result;
}