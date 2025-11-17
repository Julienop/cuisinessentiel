// extractors/sites/papillesetpupilles.js
// Règles d'extraction spécifiques pour Papilles et Pupilles

/**
 * Extrait une recette depuis papillesetpupilles.fr
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractPapillesetpupilles(root) {
    console.log('🎯 extractPapillesetpupilles appelée');
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // Titre - chercher le h1 dans .main-title
    const titleElement = root.querySelector('h1.main-title, .entry-title h1, h1');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Ingrédients - chercher après le h2 "Ingrédients"
    const ingredientsHeading = Array.from(root.querySelectorAll('h2')).find(h2 => 
        h2.textContent.toLowerCase().includes('ingrédient')
    );
    
    if (ingredientsHeading) {
        // Trouver le <ul> qui suit ce h2
        let nextElement = ingredientsHeading.nextElementSibling;
        while (nextElement) {
            if (nextElement.tagName === 'UL') {
                const items = nextElement.querySelectorAll('li');
                console.log(`🔍 ${items.length} éléments d'ingrédients trouvés`);
                
                for (const li of items) {
                    const text = li.textContent.trim();
                    if (text && text.length > 2) {
                        // Parse l'ingrédient (format simple)
                        result.ingredients.push(parseIngredientText(text));
                        console.log(`✅ Ingrédient: ${text.substring(0, 50)}`);
                    }
                }
                break;
            }
            nextElement = nextElement.nextElementSibling;
        }
    }

    // Instructions - chercher après le h2 "Préparation"
    const instructionsHeading = Array.from(root.querySelectorAll('h2')).find(h2 => 
        h2.textContent.toLowerCase().includes('préparation') || 
        h2.textContent.toLowerCase().includes('preparation')
    );
    
    if (instructionsHeading) {
        console.log('🔍 Section Préparation trouvée');
        
        // Trouver les <p> qui suivent (dans le conteneur ou directement)
        let nextElement = instructionsHeading.nextElementSibling;
        
        while (nextElement) {
            // Si c'est un div conteneur, chercher les <p> dedans
            if (nextElement.tagName === 'DIV') {
                const paragraphs = nextElement.querySelectorAll('p');
                for (const p of paragraphs) {
                    const text = p.textContent.trim();
                    // Filtrer : au moins 20 caractères et contient un verbe d'action
                    if (text.length > 20 && containsActionVerb(text)) {
                        result.instructions.push(text);
                        console.log(`✅ Instruction: ${text.substring(0, 50)}...`);
                    }
                }
                break;
            }
            // Si c'est directement un <p>
            else if (nextElement.tagName === 'P') {
                const text = nextElement.textContent.trim();
                if (text.length > 20 && containsActionVerb(text)) {
                    result.instructions.push(text);
                    console.log(`✅ Instruction: ${text.substring(0, 50)}...`);
                }
            }
            // Si on rencontre un autre h2, on s'arrête
            else if (nextElement.tagName === 'H2') {
                break;
            }
            
            nextElement = nextElement.nextElementSibling;
        }
    }

    console.log(`📊 Résultat Papilles: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

/**
 * Parse un texte d'ingrédient simple
 */
function parseIngredientText(text) {
    // Nettoyer les espaces multiples
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Format : "250 g de farine" ou "1 oeuf"
    const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-Z]+)?\s+(?:de\s+|d')?(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3].trim(),
        };
    }
    
    // Si pas de pattern reconnu, tout dans l'ingrédient
    return {
        quantite: '',
        unite: '',
        ingredient: cleaned,
    };
}

/**
 * Vérifie si un texte contient un verbe d'action (indication d'instruction de cuisine)
 */
function containsActionVerb(text) {
    const actionVerbs = [
        'préchauff', 'mélang', 'ajout', 'vers', 'mix', 'batt', 'coup',
        'dispos', 'met', 'plac', 'enfourn', 'cuis', 'laiss', 'repos',
        'fouett', 'incorpor', 'sépare', 'étale', 'beurr', 'prép',
        'fond', 'doré', 'sais', 'hach', 'émince', 'coupe', 'découp',
        'serv', 'dégust', 'refroid', 'chauf', 'port', 'saler', 'poivr'
    ];
    
    const lowerText = text.toLowerCase();
    return actionVerbs.some(verb => lowerText.includes(verb));
}