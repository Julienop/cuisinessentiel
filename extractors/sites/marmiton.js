// extractors/sites/marmiton.js
// Règles d'extraction spécifiques pour Marmiton.org
// ✅ CORRIGÉ - Novembre 2024 - Nouveaux sélecteurs CSS

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis Marmiton.org
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractMarmiton(root) {
    console.log('🎯 extractMarmiton appelée');

    // 🔍 DIAGNOSTIC : Voir ce que contient le HTML
    const htmlSnippet = root.toString().substring(0, 2000);
    console.log('📄 Extrait HTML reçu:', htmlSnippet);
    console.log('🔍 Recherche .card-ingredient:', root.querySelectorAll('.card-ingredient').length);
    console.log('🔍 Recherche .mrtn-recette_ingredients:', root.querySelectorAll('.mrtn-recette_ingredients').length);
    
    
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
    const titleElement = root.querySelector('.recipe-header__title, h1.main-title, .main-title h1');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Ingrédients - CORRIGÉ : Marmiton utilise maintenant l'attribut data-name
    const ingredientElements = root.querySelectorAll('.card-ingredient');
    console.log(`🔍 ${ingredientElements.length} éléments d'ingrédients trouvés`);
    
    for (const el of ingredientElements) {
        // Le nom de l'ingrédient est dans l'attribut data-name
        const name = el.getAttribute('data-name') || '';
        
        // Le texte complet contient quantité + unité + nom (ex: "250 g Mascarpone")
        const fullText = el.textContent.trim();
        
        if (name) {
            // Parser le texte pour extraire quantité et unité
            const parsed = parseIngredientText(fullText);
            
            result.ingredients.push({
                quantite: parsed.quantite || '',
                unite: parsed.unite || '',
                ingredient: name,
            });
            console.log(`✅ Ingrédient: ${parsed.quantite} ${parsed.unite} ${name}`);
        }
    }

    // Instructions - CORRIGÉ : Sélecteur plus robuste
    const instructionElements = root.querySelectorAll('.recipe-step-list__container p, .recipe-step-list p, .recipe-preparation p');
    console.log(`🔍 ${instructionElements.length} éléments d'instructions trouvés`);
    
    for (const el of instructionElements) {
        const text = el.textContent.trim();
        if (text && text.length > 10) {
            result.instructions.push(text);
            console.log(`✅ Instruction: ${text.substring(0, 50)}...`);
        }
    }

    // Temps de préparation - CORRIGÉ : Nouveaux sélecteurs
    const prepTimeEl = root.querySelector('.recipe-preparation__time, .time__details span, [class*="preparation"] .time_total');
    if (prepTimeEl) {
        const prepTime = prepTimeEl.textContent;
        result.temps_preparation = extractMinutesFromText(prepTime);
        console.log('✅ Temps préparation:', result.temps_preparation);
    }

    // Temps de cuisson - CORRIGÉ : Nouveaux sélecteurs
    const cookTimeEl = root.querySelector('.recipe-cooking__time, [class*="cuisson"] span, .time__details:last-child span');
    if (cookTimeEl) {
        const cookTime = cookTimeEl.textContent;
        result.temps_cuisson = extractMinutesFromText(cookTime);
        console.log('✅ Temps cuisson:', result.temps_cuisson);
    }

    // Portions - CORRIGÉ : Chercher dans les attributs data-servingscount
    const servingsEl = root.querySelector('[data-servingscount], .recipe-infos__quantity, .card-recipe-serves');
    if (servingsEl) {
        // Essayer d'abord l'attribut data-servingscount
        const servingsAttr = servingsEl.getAttribute('data-servingscount');
        if (servingsAttr) {
            result.nombre_portions = parseInt(servingsAttr, 10);
        } else {
            const servings = servingsEl.textContent;
            result.nombre_portions = extractNumberFromText(servings);
        }
        console.log('✅ Portions:', result.nombre_portions);
    }

    console.log(`📊 Résultat Marmiton: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 ? result : null;
}