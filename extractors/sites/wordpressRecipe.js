// extractors/sites/papillesetpupilles.js
// Règles d'extraction pour Papilles et Pupilles et autres blogs WordPress avec plugins de recettes
// Supporte : WP Recipe Maker, Tasty Recipes, Easy Recipe, etc.

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis les blogs WordPress avec plugins de recettes
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractWordPressRecipe(root) {
    console.log('🎯 extractWordPressRecipe appelée pour WordPress/papillesetpupilles');
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // Patterns de sélecteurs pour les plugins WordPress populaires
    const recipeSelectors = [
        '.wprm-recipe',              // WP Recipe Maker
        '.tasty-recipes',            // Tasty Recipes
        '.easyrecipe',               // Easy Recipe
        '.recipe-card',              // Generic recipe card
        '[itemtype*="Recipe"]',      // Microdata
    ];

    let recipeContainer = null;
    for (const selector of recipeSelectors) {
        recipeContainer = root.querySelector(selector);
        if (recipeContainer) {
            console.log(`✅ Container WordPress trouvé avec sélecteur: ${selector}`);
            break;
        }
    }

    if (!recipeContainer) {
        console.log('❌ Aucun container WordPress trouvé, extraction WordPress échouée');
        return null;
    }

    // Titre (chercher dans le container de recette d'abord)
    const titleSelectors = [
        '.wprm-recipe-name',
        '.tasty-recipes-title',
        '.easyrecipe-title',
        '.recipe-title',
        'h2',
        'h3',
    ];
    
    for (const selector of titleSelectors) {
        const titleElement = recipeContainer.querySelector(selector);
        if (titleElement) {
            result.titre = titleElement.textContent.trim();
            console.log('✅ Titre:', result.titre);
            break;
        }
    }

    // Ingrédients
    const ingredientSelectors = [
        '.wprm-recipe-ingredient',           // WP Recipe Maker
        '.wprm-recipe-ingredients li',
        '.tasty-recipes-ingredients li',     // Tasty Recipes
        '.easyrecipe-ingredients li',        // Easy Recipe
        '.recipe-ingredients li',
        '[itemprop="recipeIngredient"]',     // Microdata
    ];

    for (const selector of ingredientSelectors) {
        const ingredientElements = recipeContainer.querySelectorAll(selector);
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

    // Instructions
    const instructionSelectors = [
        '.wprm-recipe-instruction-text',     // WP Recipe Maker
        '.wprm-recipe-instructions li',
        '.tasty-recipes-instructions li',    // Tasty Recipes
        '.easyrecipe-instructions li',       // Easy Recipe
        '.recipe-instructions li',
        '.recipe-instructions p',
        '[itemprop="recipeInstructions"] li',
        '[itemprop="recipeInstructions"] p',
    ];

    for (const selector of instructionSelectors) {
        const instructionElements = recipeContainer.querySelectorAll(selector);
        if (instructionElements.length >= 2) {
            console.log(`🔍 ${instructionElements.length} instructions trouvées avec ${selector}`);
            for (const el of instructionElements) {
                const text = el.textContent.trim();
                if (text && text.length > 10) {
                    result.instructions.push(text);
                }
            }
            if (result.instructions.length >= 2) break;
        }
    }

    // FALLBACK : Chercher les instructions après un titre de section
    if (result.instructions.length < 2) {
        console.log('🔍 Fallback: recherche des instructions après titre de section...');
        
        const sectionTitles = ['Préparation', 'Recette', 'Instructions', 'Étapes', 'Réalisation', 'Cuisson'];
        const searchRoot = recipeContainer || root;
        const allHeadings = searchRoot.querySelectorAll('h2, h3, h4');
        
        for (const heading of allHeadings) {
            const headingText = heading.textContent.trim().toLowerCase();
            const isInstructionSection = sectionTitles.some(title => 
                headingText.includes(title.toLowerCase())
            );
            
            if (isInstructionSection) {
                console.log('✅ Trouvé section:', heading.textContent.trim());
                let sibling = heading.nextElementSibling;
                let paragraphsFound = 0;
                
                while (sibling && paragraphsFound < 30) {
                    if (sibling.tagName === 'P') {
                        const text = sibling.textContent.trim();
                        if (text.length > 15 && !text.toLowerCase().includes('publicité')) {
                            result.instructions.push(text);
                            paragraphsFound++;
                        }
                    }
                    sibling = sibling.nextElementSibling;
                }
                
                if (result.instructions.length >= 2) break;
            }
        }
    }

    // Temps de préparation
    const prepTimeSelectors = [
        '.wprm-recipe-prep-time',
        '.tasty-recipes-prep-time',
        '.recipe-prep-time',
        '[itemprop="prepTime"]',
    ];

    for (const selector of prepTimeSelectors) {
        const element = recipeContainer.querySelector(selector);
        if (element) {
            const text = element.textContent || element.getAttribute('content');
            result.temps_preparation = extractMinutesFromText(text);
            if (result.temps_preparation) break;
        }
    }

    // Temps de cuisson
    const cookTimeSelectors = [
        '.wprm-recipe-cook-time',
        '.tasty-recipes-cook-time',
        '.recipe-cook-time',
        '[itemprop="cookTime"]',
    ];

    for (const selector of cookTimeSelectors) {
        const element = recipeContainer.querySelector(selector);
        if (element) {
            const text = element.textContent || element.getAttribute('content');
            result.temps_cuisson = extractMinutesFromText(text);
            if (result.temps_cuisson) break;
        }
    }

    // Portions
    const servingsSelectors = [
        '.wprm-recipe-servings',
        '.tasty-recipes-yield',
        '.recipe-servings',
        '[itemprop="recipeYield"]',
    ];

    for (const selector of servingsSelectors) {
        const element = recipeContainer.querySelector(selector);
        if (element) {
            const text = element.textContent;
            result.nombre_portions = extractNumberFromText(text);
            if (result.nombre_portions) break;
        }
    }

    console.log(`📊 Résultat WordPress: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.titre && result.ingredients.length > 0 ? result : null;
}
