// extractors/sites/blogspot.js
// Extraction GÉNÉRIQUE pour TOUS les blogs Blogspot/Blogger
// Fonctionne avec : undejeunerdesoleil, lacuisinededey, et autres blogs Blogger

import { parseIngredientText, extractMinutesFromText, extractNumberFromText } from '../utils.js';

/**
 * Extrait une recette depuis n'importe quel blog Blogspot
 * @param {HTMLElement} root 
 * @returns {Object|null}
 */
export function extractBlogspot(root) {
    console.log('🎯 extractBlogspot appelée (règle générique)');
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // D'ABORD : Isoler le contenu de l'article
    const articleSelectors = ['.post-body', '.entry-content', 'article .post', '[itemprop="articleBody"]'];
    
    let articleContent = null;
    for (const selector of articleSelectors) {
        articleContent = root.querySelector(selector);
        if (articleContent) {
            console.log(`✅ Contenu article trouvé avec: ${selector}`);
            break;
        }
    }

    if (!articleContent) {
        console.log('❌ Pas de contenu article trouvé');
        return null;
    }

    // ENSUITE : Chercher le titre (d'abord dans toute la page, puis dans l'article)
    let titre = '';
    const titleSelectors = [
        'h1.post-title',           // Blogspot classique
        'h2.post-title',
        'h3.post-title',
        '.post-title',
        'h1.entry-title',
        '.entry-title',
        'article h1',
        'h1',
        'h2',
        'h3'
    ];

    console.log('🔍 DEBUG - Recherche du titre dans toute la page');

    // Chercher dans TOUTE la page (root) d'abord
    for (const selector of titleSelectors) {
        const titleElement = root.querySelector(selector);
        console.log(`  🔍 Essai sélecteur "${selector}":`, titleElement ? `trouvé: "${titleElement.textContent.substring(0, 50).trim()}"` : 'pas trouvé');
        
        if (titleElement) {
            titre = titleElement.textContent.trim();
            // Vérifier que ce n'est pas un titre de section ou le nom du blog
            if (titre.length > 10 && titre.length < 150 && 
                !titre.toLowerCase().match(/^(ingrédients?|préparation|recette|commentaire)/i) &&
                titre.toLowerCase() !== 'dey cuisine') {
                console.log('✅ Titre trouvé:', titre);
                break;
            } else {
                console.log(`  ❌ Titre rejeté: "${titre}"`);
                titre = ''; // Reset pour continuer
            }
        }
    }

    // Fallback : title de la page (en nettoyant mieux)
    if (!titre || titre.length < 5) {
        console.log('🔍 Fallback sur page title');
        const pageTitle = root.querySelector('title');
        if (pageTitle) {
            const fullTitle = pageTitle.textContent;
            // Essayer de nettoyer : enlever le nom du blog
            titre = fullTitle
                .split('-')[0]
                .split(':')[0]
                .split('|')[0]
                .replace(/dey cuisine/i, '')
                .trim();
            console.log('✅ Titre (page title nettoyé):', titre);
        }
    }

    result.titre = titre;

    // Extraire le texte nettoyé
    const textContent = getCleanTextContent(articleContent);
    const fullText = textContent;
    
    console.log('🔍 DEBUG - Longueur textContent:', textContent.length);

    // STRATÉGIE : Découper par sections plutôt que par lignes
    // Chercher les blocs entre mots-clés
    
    // Extraire les ingrédients en cherchant des patterns de quantités
    const ingredientPatterns = [
        // Pattern : "XXX g de YYY, ZZZ g de AAA"
        /(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l|cc|cs)\s+(?:de |d')?[^,\n]+)/gi,
        // Pattern : "X cuillères de YYY"
        /(\d+\s+(?:cuillères?|c\.|cc|cs|tasses?)\s+(?:de |d'|à |soupe |café )?[^,\n]+)/gi,
    ];

    for (const pattern of ingredientPatterns) {
        const matches = fullText.matchAll(pattern);
        for (const match of matches) {
            const ingredientText = match[1].trim();
            if (ingredientText.length > 5 && ingredientText.length < 200) {
                // Éviter les doublons
                const isDuplicate = result.ingredients.some(ing => 
                    ing.ingredient === parseIngredientText(ingredientText).ingredient
                );
                if (!isDuplicate) {
                    result.ingredients.push(parseIngredientText(ingredientText));
                }
            }
        }
    }

    console.log(`📝 ${result.ingredients.length} ingrédients extraits par pattern`);
    if (result.ingredients.length > 0 && result.ingredients.length <= 5) {
        result.ingredients.forEach((ing, i) => {
            console.log(`  ✅ Ing ${i+1}: ${ing.quantite} ${ing.unite} ${ing.ingredient.substring(0, 30)}`);
        });
    }

    // Extraire les instructions
    // Chercher après les mots-clés de sections
    const instructionKeywords = ['détrempe:', 'étaler', 'mélanger', 'placer', 'filmer', 'donner un tour', 'rabattre'];
    
    const lines = textContent.split(/[.!]\s+/).map(l => l.trim()).filter(l => l.length > 20);
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Si la ligne contient un verbe d'action de cuisine
        const hasActionVerb = instructionKeywords.some(keyword => lowerLine.includes(keyword));
        
        if (hasActionVerb && line.length > 30) {
            // Nettoyer
            let instruction = line.trim();
            
            // Éviter les doublons
            const isDuplicate = result.instructions.some(inst => inst === instruction);
            if (!isDuplicate && !instruction.match(/^\d+\s*g|^\d+\s*ml/)) {
                result.instructions.push(instruction);
            }
        }
    }

    console.log(`📝 ${result.instructions.length} instructions extraites`);
    if (result.instructions.length > 0 && result.instructions.length <= 5) {
        result.instructions.forEach((inst, i) => {
            console.log(`  ✅ Inst ${i+1}: ${inst.substring(0, 60)}`);
        });
    }

    // Chercher portions
    const servingsMatch = fullText.match(/(?:pour|quantité pour)\s+(?:environ\s+)?(\d+)\s+(?:personnes?|galettes?)/i);
    if (servingsMatch) {
        result.nombre_portions = parseInt(servingsMatch[1]);
        console.log(`👥 Portions: ${result.nombre_portions}`);
    }

    // Chercher temps
    const prepMatch = fullText.match(/(?:temps|durée)\s*(?:de)?\s*(?:préparation|prep)\s*:?\s*(\d+)\s*(?:h|min)/i);
    if (prepMatch) {
        result.temps_preparation = parseInt(prepMatch[1]);
    }

    const cookMatch = fullText.match(/(?:temps|durée)\s*(?:de)?\s*(?:cuisson|cook)\s*:?\s*(\d+)\s*(?:h|min)/i);
    if (cookMatch) {
        result.temps_cuisson = parseInt(cookMatch[1]);
    }

    console.log(`📊 Résultat Blogspot: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    
    return result.titre && result.ingredients.length >= 3 && result.instructions.length >= 2
        ? result 
        : null;
}

/**
 * Nettoie le contenu en enlevant scripts, styles, menus
 */
function getCleanTextContent(element) {
    // Simple : prendre le textContent et le nettoyer
    let text = element.textContent || element.text || '';
    
    // Supprimer les patterns JavaScript courants
    text = text.replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, '');
    text = text.replace(/_Widget[^\n]*/g, '');
    text = text.replace(/BLOG_CMT[^\n]*/g, '');
    text = text.replace(/window\.[^\n]*/g, '');
    text = text.replace(/document\.[^\n]*/g, '');
    
    return text;
}

/**
 * Filtre les lignes de navigation/menu/JavaScript
 */
function isNavigationOrMenu(line) {
    const patterns = [
        /^(accueil|home|contact|à propos|about|archives?|catégories?|partager|enregistrer|publié par|fourni par|blogger)/i,
        /^(suivez-moi|abonnez-vous|newsletter|s'abonner)/i,
        /window\.|document\.|function\(|var |const |let |_Widget|BLOG_CMT/i,
        /^https?:\/\//,
        /^\{|\}$/,
        /^OK\s*!$/,
    ];
    
    return patterns.some(pattern => pattern.test(line));
}

/**
 * Recherche alternative d'ingrédients entre "Ingrédients" et "Préparation"
 */
function extractIngredientsAlternative(lines) {
    const ingredients = [];
    let capturing = false;
    
    for (const line of lines) {
        if (line.toLowerCase().match(/^ingrédients?/i)) {
            capturing = true;
            continue;
        }
        
        if (line.toLowerCase().match(/^(préparation|instructions?|recette|étapes?)/i)) {
            break;
        }
        
        if (capturing && line.length > 5 && line.length < 250) {
            // Vérifier que ça ressemble à un ingrédient
            if (line.match(/\d/) || line.match(/(g|kg|ml|cl|l|cuillère|tasse|cs|cc|pincée)/i)) {
                if (!isNavigationOrMenu(line)) {
                    ingredients.push(parseIngredientText(line));
                    console.log(`  🔄 Ingrédient alt: ${line.substring(0, 50)}`);
                }
            }
        }
    }
    
    return ingredients;
}