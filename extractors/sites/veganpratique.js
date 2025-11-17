// extractors/sites/veganpratique.js
// Règles d'extraction spécifiques pour Vegan Pratique

export function extractVeganPratique(root) {
    console.log('🎯 extractVeganPratique appelée');
    
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
    const titleElement = root.querySelector('h1, .elementor-heading-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Ingrédients - chercher les <ul> avant les instructions
    const allUls = root.querySelectorAll('ul');
    
    for (const ul of allUls) {
        const listItems = ul.querySelectorAll('li');
        
        // Vérifier si c'est une liste d'ingrédients (pas de numéros au début)
        let isIngredientList = false;
        if (listItems.length > 0) {
            const firstText = listItems[0].textContent.trim();
            // Si ça commence par un chiffre (quantité), c'est probablement des ingrédients
            isIngredientList = /^\d/.test(firstText) || firstText.includes('banane') || firstText.includes('sucre');
        }
        
        if (isIngredientList && result.ingredients.length === 0) {
            console.log(`🔍 Liste d'ingrédients trouvée (${listItems.length} items)`);
            
            for (const li of listItems) {
                const text = li.textContent.trim();
                if (text.length > 2) {
                    result.ingredients.push(parseIngredient(text));
                    console.log(`✅ Ingrédient: ${text.substring(0, 50)}...`);
                }
            }
        }
    }

    // Instructions - dans les <p> après les ingrédients
    const allParagraphs = root.querySelectorAll('p');
    let foundInstructionSection = false;

    for (const p of allParagraphs) {
        const text = p.textContent.trim();
        
        // ✅ FILTRE : Arrêter si on arrive au footer/navigation
        if (text.includes('Trouvez la recette') || 
            text.includes('Vegan Pratique vous a plu') ||
            text.includes('parcourant notre site') ||
            text.length > 150) { // Les vraies instructions sont généralement courtes
            break; // Arrêter l'extraction
        }
        
        // Détecter le début des instructions (verbes d'action)
        if (!foundInstructionSection && (text.includes('Préchauffer') || text.includes('Mélanger') || text.includes('Ajouter'))) {
            foundInstructionSection = true;
        }
        
        if (foundInstructionSection && text.length > 20) {
            result.instructions.push(text);
            console.log(`✅ Instruction: ${text.substring(0, 50)}...`);
        }
    }

    console.log(`📊 Résultat VeganPratique: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

function parseIngredient(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
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