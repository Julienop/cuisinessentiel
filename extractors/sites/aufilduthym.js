// extractors/sites/aufilduthym.js
// Règles d'extraction spécifiques pour AuFilDuThym.fr

import { parseIngredientText } from '../utils.js';

/**
 * Extrait une recette depuis AuFilDuThym.fr
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractAuFilDuThym(root) {
    console.log('🎯 extractAuFilDuThym appelée');
    
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
    const titleElement = root.querySelector('h2, h3');
    if (titleElement) {
        const titre = titleElement.textContent.trim();
        result.titre = titre.replace(/^Recette\s*:\s*/i, '');
        console.log('✅ Titre:', result.titre);
    }

    const bodyText = root.textContent;
    const lines = bodyText.split('\n');
    
    // Trouver les indices des sections
    let ingredientsIndex = -1;
    let realisationIndex = -1;
    let astucesIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed === 'Ingrédients') ingredientsIndex = i;
        if (trimmed === 'Réalisation') realisationIndex = i;
        if (trimmed.startsWith('Astuces')) astucesIndex = i;
    }
    
    console.log(`🔍 Sections trouvées - Ingrédients: ${ingredientsIndex}, Réalisation: ${realisationIndex}, Astuces: ${astucesIndex}`);
    
    // Extraire les ingrédients (entre Ingrédients et Réalisation)
    if (ingredientsIndex !== -1 && realisationIndex !== -1) {
        for (let i = ingredientsIndex + 1; i < realisationIndex; i++) {
            const trimmed = lines[i].trim();
            
            // Ignorer les lignes vides, les titres de portion, etc.
            if (trimmed.length === 0) continue;
            if (trimmed.startsWith('Pour un')) continue;
            
            // Vérifier si la ligne ressemble à un ingrédient
            // (contient un chiffre ou commence par un mot court)
            if (/\d/.test(trimmed) || trimmed.split(' ').length <= 5) {
                result.ingredients.push(parseIngredientText(trimmed));
                console.log(`✅ Ingrédient: ${trimmed}`);
            }
        }
    }
    
    // Extraire les instructions (entre Réalisation et Astuces ou fin)
    if (realisationIndex !== -1) {
        const endIndex = astucesIndex !== -1 ? astucesIndex : lines.length;
        
        for (let i = realisationIndex + 1; i < endIndex; i++) {
            const trimmed = lines[i].trim();
            
            // Ignorer les lignes vides
            if (trimmed.length === 0) continue;
            
            // Vérifier si la ligne ressemble à une instruction
            // (phrase longue, se termine par un point)
            if (trimmed.length > 30 && (trimmed.endsWith('.') || trimmed.endsWith(')'))) {
                result.instructions.push(trimmed);
                console.log(`✅ Instruction: ${trimmed.substring(0, 60)}...`);
            }
        }
    }
    
    // Extraire le nombre de portions
    const portionsMatch = bodyText.match(/Pour un flan.*?(\d+)\s*personnes?/i);
    if (portionsMatch) {
        result.nombre_portions = parseInt(portionsMatch[1]);
        console.log(`✅ Portions: ${result.nombre_portions}`);
    }

    console.log(`📊 Résultat AuFilDuThym: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    
    return result.titre && result.ingredients.length > 0 && result.instructions.length > 0 ? result : null;
}