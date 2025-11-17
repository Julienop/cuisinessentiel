// extractors/sites/amandinecooking.js
// Règles d'extraction spécifiques pour Amandine Cooking

export function extractAmandineCooking(root) {
    console.log('🎯 extractAmandineCooking appelée');
    
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
    const titleElement = root.querySelector('h2.Post-title, h1.Post-title, .Post-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Contenu principal
    const contentElement = root.querySelector('.Post-body, .post-body, article');
    if (!contentElement) {
        console.log('❌ Contenu principal non trouvé');
        return null;
    }

    // Ingrédients - dans les <li> avec spans Lucida, AVANT les sections de préparation
    const allLists = contentElement.querySelectorAll('ul');
    
    for (const ul of allLists) {
        const listItems = ul.querySelectorAll('li');
        
        // Vérifier si c'est une liste d'ingrédients (pas de id "preparation-step")
        const firstLi = listItems[0];
        if (firstLi && !firstLi.id.includes('preparation')) {
            console.log('🔍 Liste d\'ingrédients trouvée');
            
            for (const li of listItems) {
                // Chercher les spans Lucida
                const lucidaSpans = li.querySelectorAll('span[style*="Lucida"]');
                
                if (lucidaSpans.length > 0) {
                    let text = '';
                    for (const span of lucidaSpans) {
                        text += span.textContent.trim() + ' ';
                    }
                    text = text.trim();
                    
                    if (text.length > 2) {
                        result.ingredients.push(parseIngredient(text));
                        console.log(`✅ Ingrédient: ${text.substring(0, 50)}...`);
                    }
                }
            }
            // Sortir après la première liste d'ingrédients
            if (result.ingredients.length > 0) break;
        }
    }

    // Instructions - approche mixte : chercher tous les li[id*="preparation-step"] PUIS leurs siblings
    const stepItems = root.querySelectorAll('li[id*="preparation-step"]');
    console.log(`🔍 ${stepItems.length} étapes avec id trouvées`);

    if (stepItems.length > 0) {
        // Ajouter toutes les instructions avec id
        for (const li of stepItems) {
            const text = li.textContent.trim();
            if (text.length > 20) {
                result.instructions.push(text);
                console.log(`✅ Instruction (avec id): ${text.substring(0, 50)}...`);
            }
        }
        
        // Chercher les li suivants SANS id (siblings de la dernière instruction)
        const lastStep = stepItems[stepItems.length - 1];
        let nextSibling = lastStep.nextElementSibling;
        
        while (nextSibling && nextSibling.tagName === 'LI') {
            const text = nextSibling.textContent.trim();
            if (text.length > 20) {
                result.instructions.push(text);
                console.log(`✅ Instruction (sans id): ${text.substring(0, 50)}...`);
            }
            nextSibling = nextSibling.nextElementSibling;
        }
    }

    console.log(`📊 Résultat AmandineCooking: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

function parseIngredient(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Format : "180g de chocolat noir" ou "3 œufs"
    const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-Zg]+)?\s+(?:de |d')?(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3].trim(),
        };
    }
    
    return { quantite: '', unite: '', ingredient: cleaned };
}