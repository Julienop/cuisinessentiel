// extractors/heuristicParser.js
// Parser heuristique - devine la structure HTML sans Schema.org

/**
 * Extrait une recette en devinant la structure HTML
 * Cherche les patterns courants : <ul> pour ingrédients, <ol> pour instructions, etc.
 * 
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractHeuristic(root) {
    try {
        const result = {
            titre: '',
            ingredients: [],
            instructions: [],
            temps_preparation: null,
            temps_cuisson: null,
            nombre_portions: null,
            tags: [],
        };

        // Étape 1 : Trouver le titre
        result.titre = findTitle(root);

        // Étape 2 : Trouver les ingrédients
        result.ingredients = findIngredients(root);

        // Étape 3 : Trouver les instructions
        result.instructions = findInstructions(root);

        // Étape 4 : Trouver les métadonnées (temps, portions)
        const metadata = findMetadata(root);
        result.temps_preparation = metadata.prepTime;
        result.temps_cuisson = metadata.cookTime;
        result.nombre_portions = metadata.servings;

        // Valider qu'on a au minimum titre + ingrédients + instructions
        if (result.titre && result.ingredients.length > 0 && result.instructions.length > 0) {
            const confidence = calculateConfidenceScore(result);
            console.log(`✅ Heuristique: extraction réussie (confiance: ${confidence}%)`);
            
            // N'accepter que si confiance > 60%
            if (confidence >= 60) {
                return result;
            } else {
                console.log(`⚠️ Confiance trop faible (${confidence}%), rejet`);
            }
        }

        return null;
    } catch (error) {
        console.error('Erreur parsing heuristique:', error.message);
        return null;
    }
}

/**
 * Calcule un score de confiance pour l'extraction
 * @returns {number} Score entre 0 et 100
 */
function calculateConfidenceScore(result) {
    let score = 0;
    
    // Titre (25 points)
    if (result.titre && result.titre.length > 5) score += 25;
    
    // Ingrédients (35 points)
    if (result.ingredients.length >= 5) score += 35;
    else if (result.ingredients.length >= 3) score += 25;
    else if (result.ingredients.length >= 1) score += 10;
    
    // Instructions (30 points)
    if (result.instructions.length >= 3) score += 30;
    else if (result.instructions.length >= 2) score += 20;
    else if (result.instructions.length >= 1) score += 10;
    
    // Métadonnées bonus (10 points)
    if (result.temps_preparation) score += 3;
    if (result.temps_cuisson) score += 3;
    if (result.nombre_portions) score += 4;
    
    return score;
}

/**
 * Trouve le titre de la recette
 */
function findTitle(root) {
    const titleSelectors = [
        'h1.recipe-title',
        'h1.recette-titre',
        '.recipe-header h1',
        '.recipe-title',
        'h1[itemprop="name"]',
        'h1[itemprop="headline"]',
        'article h1',
        'h1',
    ];

    for (const selector of titleSelectors) {
        const element = root.querySelector(selector);
        if (element) {
            const text = element.textContent.trim();
            if (text.length > 3 && text.length < 200) {
                return text;
            }
        }
    }

    // Fallback : title de la page
    const titleElement = root.querySelector('title');
    if (titleElement) {
        const pageTitle = titleElement.textContent.trim();
        if (pageTitle) {
            return pageTitle.split('|')[0].split('-')[0].trim();
        }
    }

    return '';
}

/**
 * Trouve la liste des ingrédients
 */
function findIngredients(root) {
    const ingredients = [];

    // Patterns courants pour les sections d'ingrédients
    const ingredientSelectors = [
        '[itemprop="ingredients"]',
        '[itemprop="recipeIngredient"]',
        '.recipe-ingredients ul li',
        '.ingredients ul li',
        '.ingredient-list li',
        '[class*="ingredient"] li',
        'ul[class*="ingredient"] li',
        '.wprm-recipe-ingredients li',
        '.wprm-recipe-ingredient',
    ];

    for (const selector of ingredientSelectors) {
        const items = root.querySelectorAll(selector);
        if (items.length >= 3) {
            for (const el of items) {
                const text = el.textContent.trim();
                if (text && text.length > 2) {
                    ingredients.push(parseIngredientText(text));
                }
            }
            
            if (ingredients.length >= 3) {
                return ingredients;
            }
        }
    }

    // Fallback : chercher après un titre de section "Ingrédients"
    if (ingredients.length < 3) {
        const sectionTitles = [
            'Ingrédients', 'Ingredients', 
            'Liste des ingrédients', 'Pour cette recette',
            'Il vous faut', 'Vous aurez besoin',
            'Les ingrédients', 'What you need',
            'Pour la recette', 'Pour réaliser',
            'Matériel et ingrédients'
        ];
        const allHeadings = root.querySelectorAll('h2, h3, h4');
        
        for (const heading of allHeadings) {
            const headingText = heading.textContent.trim().toLowerCase();
            
            // Vérifier si le titre correspond à une section d'ingrédients
            const isIngredientSection = sectionTitles.some(title => 
                headingText.includes(title.toLowerCase())
            );
            
            if (isIngredientSection) {
                // Récupérer tous les <li> qui suivent ce titre
                let sibling = heading.nextElementSibling;
                let itemsFound = 0;
                
                while (sibling && itemsFound < 50) {
                    // Arrêter si on rencontre un nouveau titre
                    if (sibling.tagName && (sibling.tagName === 'H2' || sibling.tagName === 'H3' || sibling.tagName === 'H4')) {
                        break;
                    }
                    
                    // Extraire les éléments de liste
                    if (sibling.tagName === 'UL' || sibling.tagName === 'OL') {
                        const listItems = sibling.querySelectorAll('li');
                        for (const li of listItems) {
                            const text = li.textContent.trim();
                            if (text.length > 3) {
                                ingredients.push(parseIngredientText(text));
                                itemsFound++;
                            }
                        }
                    }
                    
                    // Chercher dans les divs
                    if (sibling.tagName === 'DIV') {
                        const listsInDiv = sibling.querySelectorAll('li');
                        for (const li of listsInDiv) {
                            const text = li.textContent.trim();
                            if (text.length > 3) {
                                ingredients.push(parseIngredientText(text));
                                itemsFound++;
                            }
                        }
                    }
                    
                    sibling = sibling.nextElementSibling;
                }
                
                // Si on a trouvé au moins 3 ingrédients, on arrête
                if (ingredients.length >= 3) {
                    break;
                }
            }
        }
    }

    return ingredients.slice(0, 50);
}

/**
 * Parse un texte d'ingrédient en objet structuré
 */
function parseIngredientText(text) {
    text = text.replace(/\s+/g, ' ').trim();

    // Gérer les fractions Unicode
    text = text.replace(/½/g, '0.5')
               .replace(/¼/g, '0.25')
               .replace(/¾/g, '0.75')
               .replace(/⅓/g, '0.33')
               .replace(/⅔/g, '0.66');
    
    // Gérer les fractions "1/2", "1/4"
    text = text.replace(/(\d+)\/(\d+)/g, (match, num, denom) => {
        return (parseFloat(num) / parseFloat(denom)).toString();
    });

    const patterns = [
        // "2 à 3 oeufs" ou "2-3 oeufs"
        /^(\d+(?:[.,]\d+)?)\s*(?:à|-)\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|cuillères?|c\.|tasses?|pincée[s]?|cs|cc)?\s*(?:de |d')?(.+)$/i,
        
        // "un peu de sel", "quelques gouttes"
        /^(un peu|quelques?|une pincée)\s*(?:de |d')?(.+)$/i,
        
        // Standard: "250 g de farine"
        /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|cuillères?|c\.|tasses?|pincée[s]?|cs|cc)?\s*(?:de |d')?(.+)$/i,
        
        // Juste un nombre: "3 oeufs"
        /^(\d+)\s*(.+)$/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Pour les ranges (2-3)
            if (match[2] && !isNaN(match[2])) {
                const avg = (parseFloat(match[1]) + parseFloat(match[2])) / 2;
                return {
                    quantite: avg.toString(),
                    unite: match[3] || '',
                    ingredient: match[4] || text,
                };
            }
            
            // Pour "un peu", "quelques"
            if (['un peu', 'quelques', 'quelque', 'une pincée'].includes(match[1]?.toLowerCase())) {
                return {
                    quantite: '',
                    unite: match[1],
                    ingredient: match[2] || text,
                };
            }
            
            return {
                quantite: match[1] ? match[1].replace(',', '.') : '',
                unite: match[2] ? match[2].trim() : '',
                ingredient: match[3] ? match[3].trim() : match[2] || text,
            };
        }
    }

    return {
        quantite: '',
        unite: '',
        ingredient: text,
    };
}

/**
 * Trouve les instructions de préparation
 */
function findInstructions(root) {
    const instructions = [];

    // Patterns courants pour les instructions
    const instructionSelectors = [
        '.recipe-instructions ol li',
        '.instructions ol li',
        '.preparation ol li',
        '.recipe-steps li',
        '[class*="instruction"] li',
        '[class*="preparation"] li',
        '[class*="etape"] li',
        'ol[class*="instruction"] li',
        'ol[class*="step"] li',
    ];

    for (const selector of instructionSelectors) {
        const items = root.querySelectorAll(selector);
        if (items.length >= 2) {
            for (const el of items) {
                const text = el.textContent.trim();
                if (text && text.length > 10) {
                    instructions.push(cleanInstructionText(text));
                }
            }
            
            if (instructions.length >= 2) {
                return instructions;
            }
        }
    }

    // Fallback 1 : paragraphes dans des sections spécifiques
    if (instructions.length < 2) {
        const paragraphs = root.querySelectorAll('.recipe-instructions p, .instructions p, .preparation p');
        for (const el of paragraphs) {
            const text = el.textContent.trim();
            if (text.length > 15 && text.length < 1000) {
                instructions.push(cleanInstructionText(text));
            }
        }
    }

    // Fallback 2 : Chercher après un titre de section
    if (instructions.length < 2) {
        const sectionTitles = [
            'Préparation', 'Recette', 'Instructions', 'Étapes', 'Réalisation', 
            'Marche à suivre', 'Cuisson', 'Montage', 'Finition', 'Assemblage', 
            'Dressage', 'Pour servir', 'Service', 'Présentation', 
            'La recette', 'Comment faire', 'Méthode',
            'Preparation', 'Steps', 'Directions', 'Method'
        ];
        const allHeadings = root.querySelectorAll('h2, h3, h4');
        
        for (const heading of allHeadings) {
            const headingText = heading.textContent.trim().toLowerCase();
            
            // Vérifier si le titre correspond à une section d'instructions
            const isInstructionSection = sectionTitles.some(title => 
                headingText.includes(title.toLowerCase())
            );
            
            if (isInstructionSection) {
                // Récupérer tous les <p> et <li> qui suivent ce titre
                let sibling = heading.nextElementSibling;
                let itemsFound = 0;
                
                while (sibling && itemsFound < 30) {
                    // Si c'est un titre, vérifier s'il s'agit aussi d'une section d'instructions
                    if (sibling.tagName && (sibling.tagName === 'H2' || sibling.tagName === 'H3')) {
                        const nextHeadingText = sibling.textContent.trim().toLowerCase();
                        const isAlsoInstructionSection = sectionTitles.some(title => 
                            nextHeadingText.includes(title.toLowerCase())
                        );
                        
                        if (isAlsoInstructionSection) {
                            // C'est aussi une section d'instructions, continuer
                            sibling = sibling.nextElementSibling;
                            continue;
                        } else {
                            // C'est un autre type de section, arrêter
                            break;
                        }
                    }
                    
                    // Extraire les paragraphes
                    if (sibling.tagName === 'P') {
                        const text = sibling.textContent.trim();
                        if (text.length > 15 && 
                            !text.toLowerCase().includes('publicité') &&
                            !text.toLowerCase().includes('annonce')) {
                            instructions.push(cleanInstructionText(text));
                            itemsFound++;
                        }
                    }
                    
                    // Extraire les listes
                    if (sibling.tagName === 'OL' || sibling.tagName === 'UL') {
                        const listItems = sibling.querySelectorAll('li');
                        for (const li of listItems) {
                            const text = li.textContent.trim();
                            if (text.length > 10) {
                                instructions.push(cleanInstructionText(text));
                                itemsFound++;
                            }
                        }
                    }
                    
                    // Chercher dans les divs (sauf pubs)
                    const divClasses = sibling.tagName === 'DIV' ? (sibling.getAttribute('class') || '') : '';
                    if (sibling.tagName === 'DIV' && 
                        !divClasses.includes('ad') && 
                        !divClasses.includes('mv-ad-box')) {
                        
                        const paragraphsInDiv = sibling.querySelectorAll('p');
                        for (const p of paragraphsInDiv) {
                            const text = p.textContent.trim();
                            if (text.length > 15) {
                                instructions.push(cleanInstructionText(text));
                                itemsFound++;
                            }
                        }
                        
                        const listsInDiv = sibling.querySelectorAll('li');
                        for (const li of listsInDiv) {
                            const text = li.textContent.trim();
                            if (text.length > 10) {
                                instructions.push(cleanInstructionText(text));
                                itemsFound++;
                            }
                        }
                    }
                    
                    sibling = sibling.nextElementSibling;
                }
                
                // Si on a trouvé au moins 2 instructions, on arrête
                if (instructions.length >= 2) {
                    break;
                }
            }
        }
    }

    return instructions.slice(0, 30);
}

/**
 * Nettoie le texte d'une instruction
 */
function cleanInstructionText(text) {
    // Enlever les numéros au début
    text = text.replace(/^\d+\.\s*/, '').trim();
    
    // Enlever les "Étape X:"
    text = text.replace(/^(?:Étape|Step)\s*\d+\s*:?\s*/i, '').trim();
    
    return text;
}

/**
 * Trouve les métadonnées (temps, portions)
 */
function findMetadata(root) {
    const metadata = {
        prepTime: null,
        cookTime: null,
        servings: null,
    };

    // Méthode 1 : itemprop (Schema.org microdata)
    const prepTimeElement = root.querySelector('[itemprop="prepTime"], [itemprop="preparationTime"]');
    if (prepTimeElement) {
        const minutes = extractMinutesFromText(prepTimeElement.textContent);
        if (minutes) metadata.prepTime = minutes;
    }

    const cookTimeElement = root.querySelector('[itemprop="cookTime"]');
    if (cookTimeElement) {
        const minutes = extractMinutesFromText(cookTimeElement.textContent);
        if (minutes) metadata.cookTime = minutes;
    }

    const yieldElement = root.querySelector('[itemprop="recipeYield"]');
    if (yieldElement) {
        const servings = extractNumberFromText(yieldElement.textContent);
        if (servings) metadata.servings = servings;
    }

    // Méthode 2 : classes spécifiques
    if (!metadata.prepTime || !metadata.cookTime) {
        const timePatterns = [
            { selector: '[class*="prep"], [class*="preparation"]', key: 'prepTime' },
            { selector: '[class*="cook"], [class*="cuisson"]', key: 'cookTime' },
        ];

        for (const { selector, key } of timePatterns) {
            if (metadata[key]) continue;
            
            const elements = root.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent;
                if (text.match(/\d+\s*(min|h)/i)) {
                    const minutes = extractMinutesFromText(text);
                    if (minutes) {
                        metadata[key] = minutes;
                        break;
                    }
                }
            }
        }
    }

    // Méthode 3 : scan du texte complet
    const allText = root.textContent;
    
    if (!metadata.prepTime) {
        const prepMatch = allText.match(/(?:temps|durée)\s*(?:de)?\s*(?:préparation|prep)\s*:?\s*(\d+)\s*(?:h|heures?)?\s*(\d+)?\s*(?:min)/i);
        if (prepMatch) {
            const hours = prepMatch[2] ? parseInt(prepMatch[1]) : 0;
            const mins = prepMatch[2] ? parseInt(prepMatch[2]) : parseInt(prepMatch[1]);
            metadata.prepTime = prepMatch[2] ? (hours * 60 + mins) : mins;
        }
    }

    if (!metadata.cookTime) {
        const cookMatch = allText.match(/(?:temps|durée)\s*(?:de)?\s*(?:cuisson|cook)\s*:?\s*(\d+)\s*(?:h|heures?)?\s*(\d+)?\s*(?:min)/i);
        if (cookMatch) {
            const hours = cookMatch[2] ? parseInt(cookMatch[1]) : 0;
            const mins = cookMatch[2] ? parseInt(cookMatch[2]) : parseInt(cookMatch[1]);
            metadata.cookTime = cookMatch[2] ? (hours * 60 + mins) : mins;
        }
    }

    // Portions
    if (!metadata.servings) {
        const servingSelectors = [
            '[class*="serving"]', '[class*="portion"]', '[class*="yield"]',
            '[class*="personnes"]', '[class*="serves"]',
        ];

        for (const selector of servingSelectors) {
            const element = root.querySelector(selector);
            if (element) {
                const servings = extractNumberFromText(element.textContent);
                if (servings) {
                    metadata.servings = servings;
                    break;
                }
            }
        }
    }

    if (!metadata.servings) {
        const servingMatch = allText.match(/(?:pour|serves?)\s*(\d+)\s*(?:personnes?|people|parts?|portions?)/i);
        if (servingMatch) {
            metadata.servings = parseInt(servingMatch[1]);
        }
    }

    return metadata;
}

/**
 * Extrait un nombre de minutes depuis un texte
 */
function extractMinutesFromText(text) {
    if (!text) return null;

    // "1h30" ou "1h 30min"
    const hoursMinMatch = text.match(/(\d+)\s*h(?:eure)?s?\s*(\d+)?/i);
    if (hoursMinMatch) {
        const hours = parseInt(hoursMinMatch[1]);
        const mins = hoursMinMatch[2] ? parseInt(hoursMinMatch[2]) : 0;
        return hours * 60 + mins;
    }

    // "30 minutes" ou "30min"
    const minsMatch = text.match(/(\d+)\s*min/i);
    if (minsMatch) {
        return parseInt(minsMatch[1]);
    }

    return null;
}

/**
 * Extrait un nombre depuis un texte
 */
function extractNumberFromText(text) {
    if (!text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}