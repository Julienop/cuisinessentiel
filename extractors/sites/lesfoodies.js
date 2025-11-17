// extractors/sites/lesfoodies.js
// Règles d'extraction spécifiques pour Les Foodies

export function extractLesFoodies(root) {
    console.log('🎯 extractLesFoodies appelée');
    
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
    const titleElement = root.querySelector('.recipe-title, h1[itemprop="name"], h1');
    console.log('🔍 Titre element:', titleElement ? 'trouvé' : 'null');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // ✅ INGRÉDIENTS : Filtrer les 3 premiers
    const ingredientSpans = root.querySelectorAll('span[itemprop="ingredients"]');
    console.log(`🔍 ${ingredientSpans.length} spans d'ingrédients trouvés`);
    
    for (let i = 0; i < ingredientSpans.length; i++) {
        const text = ingredientSpans[i].textContent.trim();
        
        // Ignorer indices 0, 1, 2
        if (i < 3) {
            console.log(`⏭️ Ignoré [${i}]: ${text.substring(0, 30)}...`);
            continue;
        }
        
        if (text.length > 2) {
            result.ingredients.push(parseIngredient(text));
            console.log(`✅ Ingrédient [${i}]: ${text.substring(0, 40)}...`);
        }
    }

    // ✅ INSTRUCTIONS
    const instructionsDiv = root.querySelector('#recipe-instructions');
    console.log('🔍 Instructions div:', instructionsDiv ? 'trouvé' : 'null');

    if (instructionsDiv) {
        let fullText = instructionsDiv.textContent.trim();
        console.log('📝 Texte instructions longueur:', fullText.length);
        
        // Nettoyer
        fullText = fullText.replace(/^Étapes.*?👇/u, '').trim();
        // Couper avant "Conseils pratiques"
        const conseilsIndex = fullText.indexOf('Conseils pratiques');
        if (conseilsIndex > 0) {
            fullText = fullText.substring(0, conseilsIndex);
        }
        
        // ✅ SPLIT AMÉLIORÉ : Point + optionnel espace + Majuscule
        const sentences = fullText.split(/\.\s*(?=[A-Z])/);
        console.log(`📝 ${sentences.length} phrases trouvées`);
        
        for (const sentence of sentences) {
            const cleaned = sentence.trim();
            if (cleaned.length > 20) {
                const instruction = cleaned.endsWith('.') ? cleaned : cleaned + '.';
                result.instructions.push(instruction);
                console.log(`✅ Instruction ajoutée: ${instruction.substring(0, 40)}...`);
            }
        }
    }

    console.log(`📊 LesFoodies final: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

function parseIngredient(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-ZL]+)?\s+(?:de |d')?(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3].trim(),
        };
    }
    
    return { quantite: '', unite: '', ingredient: cleaned };
}