// extractors/sites/undejeunerdesoleil.js
// Règles d'extraction spécifiques pour Un Déjeuner de Soleil

/**
 * Extrait une recette depuis undejeunerdesoleil.com
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractUnDejeunerDeSoleil(root) {
    console.log('🎯 extractUnDejeunerDeSoleil appelée');
    
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
    const titleElement = root.querySelector('h1.entry-title, h1[itemprop="headline"]');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Contenu principal
    const contentElement = root.querySelector('.entry-content');
    if (!contentElement) {
        console.log('❌ Contenu principal non trouvé');
        return null;
    }

    // Ingrédients - chercher les <li> avec spans bleus dans le contenu
    const listItems = contentElement.querySelectorAll('li');
    console.log(`🔍 ${listItems.length} éléments <li> trouvés`);
    
    for (const li of listItems) {
        // Chercher les spans bleus (color: #0000ff ou #0000FF)
        const blueSpans = li.querySelectorAll('span[style*="color"][style*="0000ff"], span[style*="color"][style*="0000FF"]');
        
        if (blueSpans.length > 0) {
            // Extraire le texte de tous les spans bleus de ce <li>
            let ingredientText = '';
            for (const span of blueSpans) {
                ingredientText += ' ' + span.textContent.trim();
            }
            
            ingredientText = ingredientText.trim();
            
            if (ingredientText.length > 2) {
                result.ingredients.push(parseIngredient(ingredientText));
                console.log(`✅ Ingrédient: ${ingredientText.substring(0, 50)}...`);
            }
        }
    }

    // Instructions - chercher les paragraphes ou divs avec spans bleus (hors listes)
    const allElements = contentElement.querySelectorAll('div, p');
    console.log(`🔍 ${allElements.length} éléments div/p trouvés`);
    
    for (const element of allElements) {
        // Ignorer si c'est dans une liste
        if (element.closest('ul') || element.closest('ol')) {
            continue;
        }
        
        // Chercher les spans bleus
        const blueSpans = element.querySelectorAll('span[style*="color"][style*="0000ff"], span[style*="color"][style*="0000FF"]');
        
        if (blueSpans.length > 0) {
            // Extraire le texte de tous les spans bleus
            let instructionText = '';
            for (const span of blueSpans) {
                instructionText += ' ' + span.textContent.trim();
            }
            
            instructionText = instructionText.trim();
            
            // Filtrer : au moins 30 caractères et contient un verbe d'action
            if (instructionText.length > 30 && containsActionVerb(instructionText)) {
                result.instructions.push(instructionText);
                console.log(`✅ Instruction: ${instructionText.substring(0, 50)}...`);
            }
        }
    }

    console.log(`📊 Résultat UnDejeunerDeSoleil: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

/**
 * Parse un texte d'ingrédient
 */
function parseIngredient(text) {
    // Nettoyer les espaces multiples et caractères bizarres
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Format : "50 g parmesan" ou "Les feuilles d'un gros bouquet de basilic"
    const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-Z]+)?\s+(?:de |d')?(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3].trim(),
        };
    }
    
    // Si pas de quantité trouvée, tout va dans l'ingrédient
    return {
        quantite: '',
        unite: '',
        ingredient: cleaned,
    };
}

/**
 * Vérifie si un texte contient un verbe d'action (indication d'instruction)
 */
function containsActionVerb(text) {
    const actionVerbs = [
        'écras', 'ajout', 'vers', 'mélang', 'mix', 'pil', 'égoutter',
        'incorpor', 'verser', 'poivr', 'continuer', 'obtenir',
        'prép', 'coup', 'hach', 'émince', 'fond', 'serv'
    ];
    
    const lowerText = text.toLowerCase();
    return actionVerbs.some(verb => lowerText.includes(verb));
}