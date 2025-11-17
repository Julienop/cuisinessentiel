// extractors/sites/750g.js
// Règles d'extraction spécifiques pour 750g.com

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis 750g.com
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extract750g(root) {
    console.log('🎯 extract750g appelée');
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // ===== ÉTAPE 1 : TITRE =====
    const titleElement = root.querySelector('h1, .recipe-title, [itemprop="name"]');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // ===== ÉTAPE 2 : INGRÉDIENTS (depuis JSON) =====
    // 750g stocke les ingrédients dans un script JSON
    const ingredientScript = root.querySelector('script.js-ingredient-variator-data');
    
    if (ingredientScript) {
        try {
            const jsonText = ingredientScript.textContent.trim();
            const data = JSON.parse(jsonText);
            
            console.log('📦 JSON trouvé, parsing...');
            
            // Le JSON contient : data.recipeRawgredients[0].ingredients
            if (data && data.recipeRawgredients && Array.isArray(data.recipeRawgredients) && data.recipeRawgredients.length > 0) {
                const ingredientsList = data.recipeRawgredients[0]?.ingredients || [];
                console.log(`📋 ${ingredientsList.length} ingrédients dans le JSON`);
                
                for (const ing of ingredientsList) {
                    // Utiliser directement le champ "raw" qui contient le texte complet pré-formaté
                    // C'est plus fiable que de reconstruire manuellement
                    if (ing.raw) {
                        result.ingredients.push(parseIngredientText(ing.raw));
                        console.log(`✅ Ingrédient depuis JSON (raw): ${ing.raw}`);
                    } else {
                        // Fallback : construire manuellement si pas de "raw"
                        let ingredientText = '';
                        
                        // Quantité
                        if (ing.quantity) {
                            ingredientText += ing.quantity + ' ';
                        }
                        
                        // Unité (utiliser abbr en priorité car plus court)
                        if (ing.unit && ing.unit.abbr) {
                            ingredientText += ing.unit.abbr + ' ';
                        } else if (ing.unit && ing.unit.singular) {
                            ingredientText += ing.unit.singular + ' ';
                        }
                        
                        // "de" pour la liaison
                        if (ing.quantity || (ing.unit && (ing.unit.abbr || ing.unit.singular))) {
                            ingredientText += 'de ';
                        }
                        
                        // Nom de l'ingrédient
                        const name = ing.singular || ing.plural || ing.label || '';
                        ingredientText += name;
                        
                        // Alternative (ex: "ou beurre")
                        if (ing.alternative_ingredient) {
                            ingredientText += ' ou ' + ing.alternative_ingredient;
                        }
                        
                        if (ingredientText.trim()) {
                            result.ingredients.push(parseIngredientText(ingredientText.trim()));
                            console.log(`✅ Ingrédient depuis JSON (construit): ${ingredientText.trim()}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Erreur parsing JSON ingrédients:', error.message);
        }
    }
    
    // Fallback : chercher dans le HTML si le JSON a échoué
    if (result.ingredients.length === 0) {
        console.log('⚠️ JSON vide, tentative parsing HTML...');
        const ingredientElements = root.querySelectorAll('.ingredient-item, [itemprop="recipeIngredient"]');
        
        for (const el of ingredientElements) {
            const text = el.textContent.trim();
            if (text) {
                result.ingredients.push(parseIngredientText(text));
                console.log(`✅ Ingrédient depuis HTML: ${text}`);
            }
        }
    }

    console.log(`🔍 ${result.ingredients.length} ingrédients trouvés`);

    // ===== ÉTAPE 3 : INSTRUCTIONS =====
    // Les instructions sont dans : <li class="recipe-steps-item"> → <div class="recipe-steps-text"> → <p>
    const instructionElements = root.querySelectorAll('.recipe-steps-item');
    console.log(`🔍 ${instructionElements.length} éléments d'instructions trouvés`);
    
    for (const li of instructionElements) {
        // Chercher le <p> dans la structure
        const textDiv = li.querySelector('.recipe-steps-text');
        if (textDiv) {
            const p = textDiv.querySelector('p');
            if (p) {
                const text = p.textContent.trim();
                if (text && text.length > 10) {
                    result.instructions.push(text);
                    console.log(`✅ Instruction: ${text.substring(0, 60)}...`);
                }
            }
        }
    }

    // Fallback : essayer d'autres sélecteurs
    if (result.instructions.length === 0) {
        console.log('⚠️ Tentative sélecteurs alternatifs pour instructions...');
        const altInstructions = root.querySelectorAll('.recipe-step, [itemprop="recipeInstructions"] li, .recipe-steps ol li');
        
        for (const el of altInstructions) {
            const text = el.textContent.trim();
            if (text && text.length > 10) {
                result.instructions.push(text);
                console.log(`✅ Instruction (alt): ${text.substring(0, 60)}...`);
            }
        }
    }

    console.log(`🔍 ${result.instructions.length} instructions trouvées`);

    // ===== ÉTAPE 4 : TEMPS DE PRÉPARATION ET CUISSON =====
    // Les temps sont dans les <div class="recipe-steps-info-item">
    const infoItems = root.querySelectorAll('.recipe-steps-info-item');
    console.log(`🔍 ${infoItems.length} recipe-steps-info-item trouvés`);
    
    for (const item of infoItems) {
        const text = item.textContent.toLowerCase();
        
        // Chercher "préparation" ou "prep"
        if (text.includes('préparation') || text.includes('prep')) {
            const timeText = item.textContent;
            result.temps_preparation = extractMinutesFromText(timeText);
            console.log('✅ Temps préparation:', result.temps_preparation, 'min');
        }
        
        // Chercher "cuisson" ou "cook"
        if (text.includes('cuisson') || text.includes('cook')) {
            const timeText = item.textContent;
            result.temps_cuisson = extractMinutesFromText(timeText);
            console.log('✅ Temps cuisson:', result.temps_cuisson, 'min');
        }
        
        // Chercher "portions" ou "personnes"
        if (text.includes('portion') || text.includes('personne')) {
            const servingsText = item.textContent;
            result.nombre_portions = extractNumberFromText(servingsText);
            console.log('✅ Portions:', result.nombre_portions);
        }
    }
    
    // Fallback pour les portions depuis le JSON
    if (!result.nombre_portions && ingredientScript) {
        try {
            const jsonText = ingredientScript.textContent.trim();
            const data = JSON.parse(jsonText);
            if (data && data.weight) {
                result.nombre_portions = parseInt(data.weight) || null;
                console.log('✅ Portions depuis JSON:', result.nombre_portions);
            }
        } catch (error) {
            // Ignoré
        }
    }

    // ===== VALIDATION FINALE =====
    const isValid = result.titre && result.ingredients.length > 0 && result.instructions.length > 0;
    console.log(`📊 Résultat 750g: ${result.ingredients.length} ing, ${result.instructions.length} inst, valid: ${isValid}`);
    
    return isValid ? result : null;
}