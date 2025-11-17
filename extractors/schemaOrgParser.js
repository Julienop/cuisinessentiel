// extractors/schemaOrgParser.js
// Parser pour les données structurées Schema.org (JSON-LD et Microdata)

/**
 * Extrait les données de recette depuis Schema.org
 * Supporte : JSON-LD, Microdata
 * 
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractSchemaOrg(root) {
  // Priorité 1 : JSON-LD (le plus courant et fiable)
    const jsonLdData = extractJsonLd(root);
    if (jsonLdData) {
        return jsonLdData;
    }

    // Priorité 2 : Microdata (moins courant)
    const microdataData = extractMicrodata(root);
    if (microdataData) {
        return microdataData;
    }

    return null;
    }

    /**
     * Extrait les données depuis les balises JSON-LD
     * Cherche les balises <script type="application/ld+json">
     */
    function extractJsonLd(root) {
        try {
            // Trouver tous les scripts JSON-LD
            const scripts = root.querySelectorAll('script[type="application/ld+json"]');
            console.log(`🔍 DEBUG ${scripts.length} scripts JSON-LD trouvés`);
            
            for (const script of scripts) {
                try {
                    const content = script.textContent;
                    if (!content) continue;
                    
                    console.log('🔍 DEBUG Parsing JSON-LD:', content.substring(0, 200));
                    const data = JSON.parse(content);
                    console.log('🔍 DEBUG JSON parsé, type:', data['@type']);
                    
                    // Gérer les cas où data est un tableau
                    const items = Array.isArray(data) ? data : [data];
                    
                    for (const item of items) {
                        // Chercher le type Recipe dans @graph ou directement
                        const recipe = findRecipeInData(item);
                        console.log('🔍 DEBUG findRecipeInData résultat:', recipe ? 'trouvé' : 'null');
                        if (recipe) {
                            return parseSchemaOrgRecipe(recipe);
                        }
                    }
                } catch (e) {
                    // Continuer avec le prochain script si parsing échoue
                    console.log('⚠️ Erreur parsing JSON-LD:', e.message);
                    continue;
                }
            }
        } catch (error) {
            console.error('Erreur JSON-LD:', error.message);
        }
        
        console.log('❌ DEBUG Aucun JSON-LD Recipe trouvé');
        return null;
    }

    /**
     * Cherche récursivement un objet Recipe dans les données Schema.org
     */
    function findRecipeInData(data) {
    if (!data) return null;

    // Vérifier le type directement
    const type = data['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
        return data;
    }

    // Chercher dans @graph
    if (data['@graph'] && Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
        const recipe = findRecipeInData(item);
        if (recipe) return recipe;
        }
    }

    // Chercher dans les propriétés qui pourraient contenir une recette
    if (data.mainEntity) {
        return findRecipeInData(data.mainEntity);
    }

    return null;
    }

    /**
     * Parse un objet Recipe Schema.org en format app
     */
    function parseSchemaOrgRecipe(recipe) {

        console.log('🎯 parseSchemaOrgRecipe appelée !');
    console.log('🎯 Recipe object:', JSON.stringify(recipe).substring(0, 500));
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
    result.titre = recipe.name || '';

    // Ingrédients
    if (recipe.recipeIngredient && Array.isArray(recipe.recipeIngredient)) {
        console.log('🔍 DEBUG recipeIngredient:', JSON.stringify(recipe.recipeIngredient).substring(0, 300));
        result.ingredients = recipe.recipeIngredient.map(ing => parseIngredient(ing));
        console.log(`🔍 DEBUG ${result.ingredients.length} ingrédients extraits`);
        
        // Vérifier si les ingrédients ont des quantités
        const ingredientsWithQuantities = result.ingredients.filter(ing => ing.quantite && ing.quantite.length > 0);
        console.log(`🔍 DEBUG ${ingredientsWithQuantities.length} ingrédients avec quantités`);
        
        // ✅ CORRECTION : On garde les ingrédients même sans quantité
        // C'est mieux d'avoir les noms que rien du tout
        if (ingredientsWithQuantities.length === 0) {
            console.log('⚠️ Schema.org ingrédients sans quantités - mais on les garde quand même');
        }
    }

    // Instructions
    if (recipe.recipeInstructions) {
        console.log('🔍 DEBUG recipeInstructions type:', typeof recipe.recipeInstructions);
        console.log('🔍 DEBUG recipeInstructions:', JSON.stringify(recipe.recipeInstructions).substring(0, 500));
        result.instructions = parseInstructions(recipe.recipeInstructions);
        console.log('🔍 DEBUG instructions extraites:', result.instructions.length);
    }

    // ===== AMÉLIORATION : Gestion du totalTime =====
    console.log('🔍 DEBUG temps - prepTime:', recipe.prepTime);
    console.log('🔍 DEBUG temps - cookTime:', recipe.cookTime);
    console.log('🔍 DEBUG temps - totalTime:', recipe.totalTime);
    // Temps de préparation (format ISO 8601 -> minutes)
    if (recipe.prepTime) {
        result.temps_preparation = parseIsoDuration(recipe.prepTime);
        console.log('✅ temps_preparation parsé:', result.temps_preparation);
    }

    // Temps de cuisson
    if (recipe.cookTime) {
        result.temps_cuisson = parseIsoDuration(recipe.cookTime);
    }

    // Temps total (et calcul du temps de cuisson si manquant)
    if (recipe.totalTime) {
        const totalTimeMinutes = parseIsoDuration(recipe.totalTime);
        console.log('✅ totalTime parsé:', totalTimeMinutes, 'minutes');
        
        // Si cookTime manque mais qu'on a prepTime et totalTime, calculer
        if (!result.temps_cuisson && result.temps_preparation && totalTimeMinutes) {
            result.temps_cuisson = Math.max(0, totalTimeMinutes - result.temps_preparation);
            console.log(`⚙️ Temps cuisson calculé: ${result.temps_cuisson} min (total ${totalTimeMinutes} - prep ${result.temps_preparation})`);
        }
        
        // Si prepTime manque mais qu'on a cookTime et totalTime, calculer
        else if (!result.temps_preparation && result.temps_cuisson && totalTimeMinutes) {
            result.temps_preparation = Math.max(0, totalTimeMinutes - result.temps_cuisson);
            console.log(`⚙️ Temps préparation calculé: ${result.temps_preparation} min (total ${totalTimeMinutes} - cuisson ${result.temps_cuisson})`);
        }
        
        // ===== NOUVEAU CAS : Si AUCUN des deux temps n'existe, mettre totalTime en préparation =====
        else if (!result.temps_preparation && !result.temps_cuisson && totalTimeMinutes) {
            result.temps_preparation = totalTimeMinutes;
            result.temps_cuisson = 0;
            console.log(`⚙️ Aucun temps spécifique - totalTime ${totalTimeMinutes} min attribué à la préparation`);
        }
    }

    // Nombre de portions
    if (recipe.recipeYield) {
        result.nombre_portions = parseYield(recipe.recipeYield);
    }

    // Catégories / Tags
    if (recipe.recipeCategory) {
        const categories = Array.isArray(recipe.recipeCategory) 
        ? recipe.recipeCategory 
        : [recipe.recipeCategory];
        result.tags.push(...categories.filter(c => c));
    }

    if (recipe.recipeCuisine) {
        const cuisines = Array.isArray(recipe.recipeCuisine) 
        ? recipe.recipeCuisine 
        : [recipe.recipeCuisine];
        result.tags.push(...cuisines.filter(c => c));
    }

    return result;
    }

    /**
     * Parse une chaîne d'ingrédient en objet structuré
     * AMÉLIORÉ : Gère plus de formats d'ingrédients
     */
    function parseIngredient(ingredientString) {
        // Nettoyer la chaîne
        const cleaned = ingredientString.trim();
        
        // ========== FORMAT 1 : "250 g de farine" (classique français) ==========
        const match1 = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-ZÉÈ]+)?\s+(?:de\s+|d')?(.+)$/i);
        
        if (match1) {
            return {
                quantite: match1[1].replace(',', '.'),
                unite: match1[2] || '',
                ingredient: match1[3].trim(),
            };
        }

        // ========== FORMAT 2 : "1 burrata de 250 g" (quantité à la fin) ==========
        const match2 = cleaned.match(/^(\d+(?:[.,]\d+)?)\s+(.+?)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*([a-zéèêA-Z]+)$/i);
        
        if (match2) {
            return {
                quantite: match2[3].replace(',', '.'),
                unite: match2[4] || '',
                ingredient: `${match2[1]} ${match2[2]}`.trim(),
            };
        }

        // ========== FORMAT 3 : "Gingembre - 10 grammes" (Cookomix inversé) ==========
        const match3 = cleaned.match(/^(.+?)\s*-\s*(\d+(?:[.,]\d+)?)\s*([a-zéèêA-Z]+)?$/i);
        
        if (match3) {
            return {
                quantite: match3[2].replace(',', '.'),
                unite: match3[3] || '',
                ingredient: match3[1].trim(),
            };
        }

        // ========== FORMAT 4 : "Gingembre (10 g)" (entre parenthèses) ==========
        const match4 = cleaned.match(/^(.+?)\s*\((\d+(?:[.,]\d+)?)\s*([a-zéèêA-Z]+)?\)$/i);
        
        if (match4) {
            return {
                quantite: match4[2].replace(',', '.'),
                unite: match4[3] || '',
                ingredient: match4[1].trim(),
            };
        }

        // ========== FORMAT 5 : "1 oeuf" ou "3 pincées de sel" (nombre + nom) ==========
        const match5 = cleaned.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/i);
        
        if (match5) {
            return {
                quantite: match5[1].replace(',', '.'),
                unite: '',
                ingredient: match5[2].trim(),
            };
        }

        // Si aucun format reconnu, tout va dans l'ingrédient
        return {
            quantite: '',
            unite: '',
            ingredient: cleaned,
        };
    }

    /**
     * Parse les instructions (plusieurs formats possibles)
     */
    function parseInstructions(instructions) {
    const result = [];

    // Cas 1 : Null ou undefined
    if (!instructions) {
        return [];
    }

    // Cas 2 : String unique
    if (typeof instructions === 'string') {
        return instructions
        .split(/\n|(?=\d+\.)/)
        .map(s => s.replace(/^\d+\.\s*/, '').trim())
        .filter(s => s.length > 5);
    }

    // Cas 3 : Objet unique (HowToStep ou HowToSection)
    if (typeof instructions === 'object' && !Array.isArray(instructions)) {
        const extracted = extractInstructionsFromObject(instructions);
        return extracted.filter(s => s.length > 5);
    }

    // Cas 4 : Tableau
    if (Array.isArray(instructions)) {
        for (const inst of instructions) {
        // String directement
        if (typeof inst === 'string') {
            const cleaned = inst.trim();
            if (cleaned.length > 5) {
            result.push(cleaned);
            }
        }
        // Objet (HowToStep, HowToSection, etc.)
        else if (typeof inst === 'object' && inst !== null) {
            const extracted = extractInstructionsFromObject(inst);
            result.push(...extracted.filter(s => s.length > 5));
        }
        }
    }

    return result;
    }

    /**
     * Extrait les instructions depuis un objet (HowToStep, HowToSection, etc.)
     */
    function extractInstructionsFromObject(obj) {
    const result = [];

    if (!obj || typeof obj !== 'object') {
        return result;
    }

    // Cas 1 : Objet avec propriété "text"
    if (obj.text) {
        result.push(obj.text.trim());
    }

    // Cas 2 : HowToSection avec itemListElement
    if (obj['@type'] === 'HowToSection' && obj.itemListElement) {
        const items = Array.isArray(obj.itemListElement) 
        ? obj.itemListElement 
        : [obj.itemListElement];
        
        for (const item of items) {
        if (typeof item === 'string') {
            result.push(item.trim());
        } else if (item && item.text) {
            result.push(item.text.trim());
        }
        }
    }

    // Cas 3 : Objet avec itemListElement direct
    else if (obj.itemListElement) {
        const items = Array.isArray(obj.itemListElement) 
        ? obj.itemListElement 
        : [obj.itemListElement];
        
        for (const item of items) {
        const extracted = extractInstructionsFromObject(item);
        result.push(...extracted);
        }
    }

    // Cas 4 : HowToStep avec @type
    if (obj['@type'] === 'HowToStep') {
        // Déjà géré par obj.text ci-dessus
    }

    // Cas 5 : Propriété "name" comme fallback
    if (result.length === 0 && obj.name) {
        result.push(obj.name.trim());
    }

    return result;
    }

    /**
     * Parse une durée ISO 8601 en minutes
     * Ex: "PT30M" -> 30, "PT1H30M" -> 90, "PT2H" -> 120
     * AMÉLIORÉ : Gère aussi les secondes et les jours
     */
    function parseIsoDuration(duration) {
    if (!duration || typeof duration !== 'string') return null;

    // Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S ou PT[n]H[n]M[n]S
    const match = duration.match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return null;

    const years = parseInt(match[1] || 0);
    const months = parseInt(match[2] || 0);
    const days = parseInt(match[3] || 0);
    const hours = parseInt(match[4] || 0);
    const minutes = parseInt(match[5] || 0);
    const seconds = parseFloat(match[6] || 0);

    // Convertir tout en minutes (approximation pour années et mois)
    const totalMinutes = 
        years * 365 * 24 * 60 +
        months * 30 * 24 * 60 +
        days * 24 * 60 +
        hours * 60 +
        minutes +
        Math.round(seconds / 60);

    return totalMinutes > 0 ? totalMinutes : null;
    }

    /**
     * Parse le nombre de portions
     * Ex: "4 personnes" -> 4, "6" -> 6, ["4", "6"] -> 4
     */
    function parseYield(yieldValue) {
    if (typeof yieldValue === 'number') {
        return yieldValue;
    }

    if (typeof yieldValue === 'string') {
        const match = yieldValue.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    if (Array.isArray(yieldValue) && yieldValue.length > 0) {
        return parseYield(yieldValue[0]);
    }

    return null;
    }

    /**
     * Extrait depuis Microdata (moins prioritaire)
     * Format : <div itemscope itemtype="http://schema.org/Recipe">
     */
    function extractMicrodata(root) {
    try {
        const recipeElement = root.querySelector('[itemscope][itemtype*="Recipe"]');
        if (!recipeElement) return null;

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
        const titleElement = recipeElement.querySelector('[itemprop="name"]');
        if (titleElement) {
            result.titre = titleElement.textContent.trim();
        }

        // Ingrédients
        const ingredientElements = recipeElement.querySelectorAll('[itemprop="recipeIngredient"]');
        for (const el of ingredientElements) {
        const ing = el.textContent.trim();
        if (ing) {
            result.ingredients.push(parseIngredient(ing));
        }
        }

        // Instructions
        const instructionElements = recipeElement.querySelectorAll('[itemprop="recipeInstructions"]');
        for (const el of instructionElements) {
        const inst = el.textContent.trim();
        if (inst) {
            result.instructions.push(inst);
        }
        }

        // Temps
        const prepTimeElement = recipeElement.querySelector('[itemprop="prepTime"]');
        if (prepTimeElement) {
        const prepTime = prepTimeElement.getAttribute('content');
        if (prepTime) {
            result.temps_preparation = parseIsoDuration(prepTime);
        }
        }

        const cookTimeElement = recipeElement.querySelector('[itemprop="cookTime"]');
        if (cookTimeElement) {
        const cookTime = cookTimeElement.getAttribute('content');
        if (cookTime) {
            result.temps_cuisson = parseIsoDuration(cookTime);
        }
        }

        // Temps total (avec calcul si nécessaire)
        const totalTimeElement = recipeElement.querySelector('[itemprop="totalTime"]');
        if (totalTimeElement) {
        const totalTime = totalTimeElement.getAttribute('content');
        if (totalTime) {
            const totalTimeMinutes = parseIsoDuration(totalTime);
            
            // Calculer les temps manquants
            if (!result.temps_cuisson && result.temps_preparation && totalTimeMinutes) {
                result.temps_cuisson = Math.max(0, totalTimeMinutes - result.temps_preparation);
            }
            if (!result.temps_preparation && result.temps_cuisson && totalTimeMinutes) {
                result.temps_preparation = Math.max(0, totalTimeMinutes - result.temps_cuisson);
            }
        }
        }

        // Portions
        const yieldElement = recipeElement.querySelector('[itemprop="recipeYield"]');
        if (yieldElement) {
        const yieldValue = yieldElement.textContent.trim();
        if (yieldValue) {
            result.nombre_portions = parseYield(yieldValue);
        }
        }

        return result;
    } catch (error) {
        console.error('Erreur Microdata:', error.message);
        return null;
    }
}