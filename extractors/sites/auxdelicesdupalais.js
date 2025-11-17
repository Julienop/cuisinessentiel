/**
 * Extracteur spécifique pour auxdelicesdupalais.net
 * Le site utilise WP Recipe Maker avec Schema.org JSON-LD
 */

function extractAuxDelicesDuPalais(root) {
    const result = {
        name: '',
        ingredients: [],
        instructions: [],
        servings: '',
        prepTime: '',
        cookTime: '',
        totalTime: '',
        image: '',
        notes: ''
    };

    // Chercher le script JSON-LD avec les données de recette
    const scripts = root.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
        try {
            const data = JSON.parse(script.textContent);
            
            // Le site utilise un graphe Schema.org, chercher l'objet Recipe
            let recipe = null;
            
            if (data['@type'] === 'Recipe') {
                recipe = data;
            } else if (data['@graph']) {
                // Chercher dans le graphe
                recipe = data['@graph'].find(item => item['@type'] === 'Recipe');
            }
            
            if (recipe) {
                // Nom de la recette
                result.name = recipe.name || '';
                
                // Ingrédients
                if (recipe.recipeIngredient && Array.isArray(recipe.recipeIngredient)) {
                    result.ingredients = recipe.recipeIngredient.map(ing => ({
                        raw: ing,
                        item: ing
                    }));
                }
                
                // Instructions
                if (recipe.recipeInstructions && Array.isArray(recipe.recipeInstructions)) {
                    result.instructions = recipe.recipeInstructions.map((step, index) => {
                        if (typeof step === 'string') {
                            return { text: step };
                        } else if (step['@type'] === 'HowToStep' && step.text) {
                            return { text: step.text };
                        }
                        return null;
                    }).filter(step => step !== null);
                }
                
                // Portions
                if (recipe.recipeYield) {
                    if (Array.isArray(recipe.recipeYield)) {
                        result.servings = recipe.recipeYield[0];
                    } else {
                        result.servings = recipe.recipeYield.toString();
                    }
                }
                
                // Temps (format ISO 8601 -> convertir en minutes)
                result.prepTime = convertISO8601ToMinutes(recipe.prepTime);
                result.cookTime = convertISO8601ToMinutes(recipe.cookTime);
                result.totalTime = convertISO8601ToMinutes(recipe.totalTime);
                
                // Image
                if (recipe.image) {
                    if (Array.isArray(recipe.image)) {
                        result.image = recipe.image[0];
                    } else if (typeof recipe.image === 'object' && recipe.image.url) {
                        result.image = recipe.image.url;
                    } else {
                        result.image = recipe.image;
                    }
                }
                
                // Notes (description)
                if (recipe.description) {
                    result.notes = recipe.description;
                }
                
                return result;
            }
        } catch (e) {
            console.log('Erreur parsing JSON-LD:', e);
            continue;
        }
    }
    
    return result;
}

/**
 * Convertit un format ISO 8601 duration en minutes
 * Ex: "PT15M" -> "15", "PT1H10M" -> "70"
 */
function convertISO8601ToMinutes(duration) {
    if (!duration) return '';
    
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
    const matches = duration.match(regex);
    
    if (!matches) return '';
    
    const hours = parseInt(matches[1] || 0);
    const minutes = parseInt(matches[2] || 0);
    
    const totalMinutes = (hours * 60) + minutes;
    
    return totalMinutes > 0 ? totalMinutes.toString() : '';
}

module.exports = extractAuxDelicesDuPalais;