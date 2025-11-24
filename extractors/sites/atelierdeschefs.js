export function extractAtelierDesChefs(root) {
    console.log('🔍 Extraction Atelier des Chefs...');

 // Chercher TOUS les scripts (y compris text/javascript)
console.log('🐛 Recherche de TOUS les scripts...');
const allScripts = root.querySelectorAll('script');
console.log(`🐛 Trouvé ${allScripts.length} scripts au total`);

// Afficher les premiers pour debug
allScripts.forEach((script, i) => {
    if (i < 10) { // Limiter aux 10 premiers
        const content = script.textContent.substring(0, 200);
        const src = script.getAttribute('src');
        const type = script.getAttribute('type');
        console.log(`🐛 Script #${i}: type="${type}", src="${src ? src.substring(0, 50) : 'inline'}", contenu: ${content.substring(0, 80)}...`);
    }
});
    
    const recipe = {
        titre: null,
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
    };

    // 🔍 Chercher les données Next.js dans <script id="__NEXT_DATA__">
    console.log('🐛 Recherche __NEXT_DATA__...');
    const nextDataScript = root.querySelector('script#__NEXT_DATA__');
    
    if (nextDataScript) {
        try {
            const jsonData = JSON.parse(nextDataScript.textContent);
            console.log('✅ Données Next.js trouvées !');
            
            // Les données de la recette sont probablement dans props.pageProps
            const pageProps = jsonData?.props?.pageProps;
            const recipeData = pageProps?.recipe || pageProps?.recipeData || pageProps;
            
            console.log('🐛 Structure des données:', Object.keys(recipeData || {}).join(', '));
            
            if (recipeData) {
                // Extraire le titre
                recipe.titre = recipeData.title || recipeData.name || recipeData.titre;
                
                // Extraire les temps
                if (recipeData.prepTime || recipeData.preparationTime) {
                    const prepMatch = String(recipeData.prepTime || recipeData.preparationTime).match(/(\d+)/);
                    if (prepMatch) recipe.temps_preparation = parseInt(prepMatch[1]);
                }
                if (recipeData.cookTime || recipeData.cookingTime) {
                    const cookMatch = String(recipeData.cookTime || recipeData.cookingTime).match(/(\d+)/);
                    if (cookMatch) recipe.temps_cuisson = parseInt(cookMatch[1]);
                }
                
                // Extraire les ingrédients
                const ingredients = recipeData.ingredients || recipeData.recipeIngredient || [];
                ingredients.forEach(ing => {
                    if (typeof ing === 'string') {
                        // Parser la chaîne
                        const match = ing.match(/^([\d,\.\/\s]+)?\s*([a-zA-Zàâäéèêëïîôùûüç]+)?\s*(.+)$/);
                        if (match) {
                            recipe.ingredients.push({
                                quantite: (match[1] || '').trim(),
                                unite: (match[2] || '').trim(),
                                ingredient: (match[3] || ing).trim()
                            });
                        }
                    } else if (typeof ing === 'object') {
                        // Si c'est déjà un objet structuré
                        recipe.ingredients.push({
                            quantite: ing.quantity || ing.quantite || '',
                            unite: ing.unit || ing.unite || '',
                            ingredient: ing.name || ing.ingredient || ing.nom || ''
                        });
                    }
                });
                
                // Extraire les instructions
                const instructions = recipeData.instructions || recipeData.recipeInstructions || recipeData.steps || [];
                instructions.forEach(step => {
                    if (typeof step === 'string') {
                        recipe.instructions.push(step);
                    } else if (step.text) {
                        recipe.instructions.push(step.text);
                    } else if (step.description) {
                        recipe.instructions.push(step.description);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Erreur parsing __NEXT_DATA__:', error.message);
        }
    } else {
        console.log('❌ Pas de __NEXT_DATA__ trouvé');
    }

    console.log(`✅ Atelier des Chefs: ${recipe.ingredients.length} ing, ${recipe.instructions.length} inst`);
    return recipe;
}