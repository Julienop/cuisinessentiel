// extractors/sites/cookomix.js
// Règles d'extraction spécifiques pour Cookomix.com (recettes Thermomix)

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis Cookomix.com
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractCookomix(root) {
    console.log('🎯 extractCookomix appelée');
    
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
    const titleElement = root.querySelector('h1.entry-title, h1, .recipe-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // ========== INGRÉDIENTS - SÉLECTEURS SPÉCIFIQUES COOKOMIX ==========
    
    // Mots-clés à exclure (indiquent que ce n'est PAS un ingrédient)
    const excludeKeywords = [
        'blog', 'quoi de neuf', 'commentaire', 'recette', 'étape',
        'préchauffer', 'four', 'thermomix', 'vitesse', 'température',
        'mon compte', 'connexion', 'recherche', 'catégorie', 'navigation',
        'partager', 'imprimer', 'enregistrer', 'ajouter', 'modifier',
        'laisser un commentaire', 'répondre', 'j\'ai testé', 'note',
        'découvrez', 'voir', 'afficher', 'menu', 'accueil'
    ];

    // Fonction pour vérifier si un texte ressemble à un ingrédient
    const looksLikeIngredient = (text) => {
        if (!text || text.length < 3 || text.length > 150) return false;
        
        // Exclure si contient des mots-clés interdits
        const lowerText = text.toLowerCase();
        if (excludeKeywords.some(keyword => lowerText.includes(keyword))) {
            console.log(`❌ Exclu (mot-clé): ${text.substring(0, 50)}`);
            return false;
        }
        
        // Exclure les textes avec beaucoup de ponctuation (commentaires)
        const punctuationCount = (text.match(/[.!?;:]/g) || []).length;
        if (punctuationCount > 2) {
            console.log(`❌ Exclu (ponctuation): ${text.substring(0, 50)}`);
            return false;
        }
        
        // Exclure les URLs
        if (text.includes('http') || text.includes('www.')) {
            console.log(`❌ Exclu (URL): ${text.substring(0, 50)}`);
            return false;
        }
        
        // Un vrai ingrédient contient souvent un nombre OU des mots alimentaires communs
        const hasNumber = /\d/.test(text);
        const foodWords = [
            'gramme', 'kg', 'litre', 'ml', 'cl', 'cuillère', 'tasse', 'pincée',
            'g', 'l', 'c.', 'cs', 'cc', 'farine', 'sucre', 'sel', 'poivre',
            'beurre', 'huile', 'eau', 'lait', 'œuf', 'oeufs', 'tomate',
            'oignon', 'ail', 'viande', 'poisson', 'poulet', 'légume', 'fruit'
        ];
        const hasFoodWord = foodWords.some(word => lowerText.includes(word));
        
        if (!hasNumber && !hasFoodWord) {
            console.log(`❌ Exclu (pas d'ingrédient): ${text.substring(0, 50)}`);
            return false;
        }
        
        return true;
    };

    // Sélecteurs spécifiques Cookomix (plus précis)
    const ingredientSelectors = [
        '.wprm-recipe-ingredient',              // Plugin WP Recipe Maker
        '.wprm-recipe-ingredients li',
        '.recipe-ingredients ul li',            // Container spécifique
        '.ingredients ul li',
        'article .wprm-recipe-ingredient-group li',  // Dans l'article
    ];

    for (const selector of ingredientSelectors) {
        const ingredientElements = root.querySelectorAll(selector);
        if (ingredientElements.length >= 3) {
            console.log(`🔍 ${ingredientElements.length} éléments trouvés avec ${selector}`);
            
            for (const el of ingredientElements) {
                const text = el.textContent.trim();
                
                if (looksLikeIngredient(text)) {
                    result.ingredients.push(parseIngredientText(text));
                    console.log(`✅ Ingrédient validé: ${text.substring(0, 50)}`);
                }
            }
            
            if (result.ingredients.length >= 3) {
                console.log(`✅ ${result.ingredients.length} ingrédients valides trouvés`);
                break;
            } else {
                // Réinitialiser pour essayer le prochain sélecteur
                result.ingredients = [];
            }
        }
    }

    // FALLBACK : Si toujours rien, chercher dans un container plus large mais avec filtres stricts
    if (result.ingredients.length < 3) {
        console.log('🔍 Fallback: recherche large avec filtres stricts...');
        
        // Chercher d'abord un container "ingrédients"
        const ingredientContainer = root.querySelector('.wprm-recipe-ingredients, .recipe-ingredients, [class*="ingredient"]');
        
        if (ingredientContainer) {
            const allLi = ingredientContainer.querySelectorAll('li');
            console.log(`🔍 ${allLi.length} <li> trouvés dans le container`);
            
            for (const li of allLi) {
                const text = li.textContent.trim();
                if (looksLikeIngredient(text)) {
                    result.ingredients.push(parseIngredientText(text));
                    console.log(`✅ Ingrédient (fallback): ${text.substring(0, 50)}`);
                }
            }
        }
    }

    // ========== INSTRUCTIONS ==========
    
    const instructionSelectors = [
        '.wprm-recipe-instruction-text',
        '.wprm-recipe-instructions li',
        '.recipe-instructions p',
        '.instructions p',
        'ol li',
    ];

    for (const selector of instructionSelectors) {
        const instructionElements = root.querySelectorAll(selector);
        if (instructionElements.length >= 2) {
            console.log(`🔍 ${instructionElements.length} instructions trouvées avec ${selector}`);
            for (const el of instructionElements) {
                const text = el.textContent.trim();
                // Filtrer les instructions trop courtes
                if (text && text.length > 20) {
                    result.instructions.push(text);
                }
            }
            if (result.instructions.length >= 2) break;
        }
    }

    // ========== MÉTADONNÉES ==========
    
    // Temps et portions
    const timeElements = root.querySelectorAll('[class*="time"], .recipe-time, .wprm-recipe-time');
    for (const el of timeElements) {
        const text = el.textContent;
        const minutes = extractMinutesFromText(text);
        if (minutes && text.toLowerCase().includes('préparation')) {
            result.temps_preparation = minutes;
        } else if (minutes && text.toLowerCase().includes('cuisson')) {
            result.temps_cuisson = minutes;
        }
    }

    // Portions
    const portionsSelectors = [
        '.wprm-recipe-servings',
        '.recipe-yield',
        '[class*="serving"]',
        '[class*="portion"]'
    ];
    
    for (const selector of portionsSelectors) {
        const portionsElement = root.querySelector(selector);
        if (portionsElement) {
            result.nombre_portions = extractNumberFromText(portionsElement.textContent);
            if (result.nombre_portions) break;
        }
    }

    console.log(`📊 Résultat Cookomix: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length >= 3 && result.instructions.length > 0 ? result : null;
}