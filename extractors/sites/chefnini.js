// extractors/sites/chefnini.js
// Extraction spécifique pour chefnini.com

export function extractChefnini(root) {
    try {
        const result = {
            titre: '',
            ingredients: [],
            instructions: [],
            temps_preparation: null,
            temps_cuisson: null,
            nombre_portions: null,
        };

        // Titre
        const titleElement = root.querySelector('h1[itemprop="headline"], h1.entry-title');
        if (titleElement) {
            result.titre = titleElement.textContent.trim();
        }

        // Ingrédients (itemprop="ingredients")
        const ingredientElements = root.querySelectorAll('[itemprop="ingredients"]');
        for (const el of ingredientElements) {
            const text = el.textContent.trim();
            if (text.length > 2) {
                result.ingredients.push(parseIngredient(text));
            }
        }

        // ✅ CORRECTION : Instructions depuis itemprop="recipeInstructions" (priorité 1)
        const instructionsContainer = root.querySelector('[itemprop="recipeInstructions"]');
        if (instructionsContainer) {
            console.log('🔍 Container recipeInstructions trouvé');
            const instructionParagraphs = instructionsContainer.querySelectorAll('p');
            
            for (const p of instructionParagraphs) {
                const text = p.textContent.trim();
                if (text.length > 15 && !text.includes('publicité')) {
                    // Nettoyer le numéro au début (format "5-" ou "6)")
                    const cleaned = text.replace(/^\d+[-.)]\s*/, '');
                    result.instructions.push(cleaned);
                    console.log(`✅ Instruction: ${cleaned.substring(0, 50)}...`);
                }
            }
        }

        // Si pas d'instructions trouvées via itemprop, essayer la méthode h3 (fallback)
        if (result.instructions.length === 0) {
            console.log('🔍 Tentative extraction instructions via h3...');
            const allH3 = root.querySelectorAll('h3');
            
            for (const h3 of allH3) {
                const sectionTitle = h3.textContent.trim().toLowerCase();
                
                // Ignorer les sections d'ingrédients et autres non-instructions
                if (sectionTitle.includes('ingrédient') || 
                    sectionTitle.includes('commentaire') ||
                    sectionTitle.includes('note')) {
                    continue;
                }
                
                // Extraire tous les <p> qui suivent ce h3
                let sibling = h3.nextElementSibling;
                
                while (sibling) {
                    // Arrêter si on rencontre un nouveau h3
                    if (sibling.tagName === 'H3') {
                        break;
                    }
                    
                    // Extraire les paragraphes
                    if (sibling.tagName === 'P') {
                        const text = sibling.textContent.trim();
                        if (text.length > 15 && !text.includes('publicité')) {
                            // Nettoyer le numéro au début
                            const cleaned = text.replace(/^\d+[-.)]\s*/, '');
                            result.instructions.push(cleaned);
                        }
                    }
                    
                    sibling = sibling.nextElementSibling;
                }
            }
        }

        console.log(`📊 Chefnini: ${result.ingredients.length} ing, ${result.instructions.length} inst`);

        // Portions (itemprop="recipeYield")
        const yieldElement = root.querySelector('[itemprop="recipeYield"]');
        if (yieldElement) {
            const match = yieldElement.textContent.match(/(\d+)/);
            if (match) {
                result.nombre_portions = parseInt(match[1]);
            }
        }

        // Temps (chercher dans le texte)
        const allText = root.textContent;
        
        const prepMatch = allText.match(/(?:temps|durée)\s*(?:de)?\s*(?:préparation|prep)\s*:?\s*(\d+)\s*(?:min)/i);
        if (prepMatch) {
            result.temps_preparation = parseInt(prepMatch[1]);
        }

        const cookMatch = allText.match(/(?:temps|durée)\s*(?:de)?\s*(?:cuisson|cook)\s*:?\s*(\d+)\s*(?:min)/i);
        if (cookMatch) {
            result.temps_cuisson = parseInt(cookMatch[1]);
        }

        return result;
    } catch (error) {
        console.error('Erreur extraction chefnini:', error);
        return null;
    }
}

function parseIngredient(text) {
    text = text.replace(/\s+/g, ' ').trim();
    
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|cuillères?|c\.)?\s*(?:de |d')?(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3],
        };
    }
    
    return {
        quantite: '',
        unite: '',
        ingredient: text,
    };
}