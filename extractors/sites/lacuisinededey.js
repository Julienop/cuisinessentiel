// extractors/sites/lacuisinededey.js
// Règles d'extraction spécifiques pour La Cuisine de Dey

/**
 * Extrait une recette depuis lacuisinededey.blogspot.com
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractLaCuisineDeDey(root) {
    console.log('🎯 extractLaCuisineDeDey appelée');
    
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
    const titleElement = root.querySelector('h3.post-title, h2.post-title, h1[itemprop="name"]');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Contenu principal
    const contentElement = root.querySelector('.post-body, .entry-content');
    if (!contentElement) {
        console.log('❌ Contenu principal non trouvé');
        return null;
    }

    // Ingrédients - chercher le div contenant "Pour X personnes/portions :"
    const allDivs = contentElement.querySelectorAll('div[style*="text-align"]');
    
    for (const div of allDivs) {
        const text = div.textContent.trim();
        
        // Détecter le paragraphe d'ingrédients (commence par "Pour X")
        if (text.match(/^Pour\s+\d+/i)) {
            console.log('🔍 Paragraphe d\'ingrédients trouvé');
            
            // Extraire le nombre de portions
            const portionsMatch = text.match(/Pour\s+(\d+)/i);
            if (portionsMatch) {
                result.nombre_portions = parseInt(portionsMatch[1]);
                console.log(`✅ Portions: ${result.nombre_portions}`);
            }
            
            // Parser les ingrédients (format: "200 g de butternut pelée, 1 œuf, ...")
            // Séparer par virgules ou points-virgules
            const ingredientsPart = text.replace(/^Pour\s+\d+[^:]*:\s*/i, '').trim();
            const ingredientsList = ingredientsPart.split(/[,;]+/).map(s => s.trim());
            
            for (const ing of ingredientsList) {
                if (ing.length > 2) {
                    result.ingredients.push(parseIngredient(ing));
                    console.log(`✅ Ingrédient: ${ing.substring(0, 50)}...`);
                }
            }
            
            // Continuer pour chercher d'autres paragraphes d'ingrédients
        } 
        // Paragraphe de paner/assaisonnement
        else if (text.match(/^Pour\s+(paner|assaisonner|la\s+sauce)/i)) {
            console.log('🔍 Paragraphe complémentaire trouvé');
            const ingredientsPart = text.replace(/^Pour\s+[^:]*:\s*/i, '').trim();
            const ingredientsList = ingredientsPart.split(/[,;+]+/).map(s => s.trim());
            
            for (const ing of ingredientsList) {
                if (ing.length > 2) {
                    result.ingredients.push(parseIngredient(ing));
                    console.log(`✅ Ingrédient: ${ing.substring(0, 50)}...`);
                }
            }
        }
    }

    // Instructions - chercher dans les listes <ul> <li>
    const lists = contentElement.querySelectorAll('ul');
    console.log(`🔍 ${lists.length} listes trouvées`);
    
    for (const ul of lists) {
        const listItems = ul.querySelectorAll('li');
        
        for (const li of listItems) {
            const text = li.textContent.trim();
            
            // Filtrer : au moins 20 caractères
            if (text.length > 20) {
                // Nettoyer les marqueurs "::marker" si présents
                const cleaned = text.replace(/^::marker\s*"?/, '').replace(/"$/, '').trim();
                
                result.instructions.push(cleaned);
                console.log(`✅ Instruction: ${cleaned.substring(0, 50)}...`);
            }
        }
    }

    console.log(`📊 Résultat LaCuisineDeDey: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

/**
 * Parse un texte d'ingrédient
 */
function parseIngredient(text) {
    // Nettoyer les espaces multiples
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Format : "200 g de butternut pelée" ou "1 œuf"
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