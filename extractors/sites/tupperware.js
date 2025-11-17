// extractors/sites/tupperware.js
// Règles d'extraction spécifiques pour Tupperware.tn

import { parseIngredientText } from '../utils.js';

/**
 * Extrait une recette depuis Tupperware.tn
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractTupperware(root) {
    console.log('🎯 extractTupperware appelée');
    
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
    const titleElement = root.querySelector('h1, h2.recipe-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre:', result.titre);
    }

    // Instructions - NOUVELLE STRATÉGIE
    // Chercher les lignes qui commencent par un verbe d'action (sans tiret)
    const bodyText = root.textContent;
    const lines = bodyText.split('\n');
    
    // Trouver l'index de la dernière occurrence de "Préparation"
    let prepStartIndex = -1;
    let astuceIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed === 'Préparation') {
            prepStartIndex = i;
        }
        if (trimmed.startsWith('Astuce:')) {
            astuceIndex = i;
            break; // On s'arrête à l'astuce
        }
    }
    
    console.log(`🔍 DEBUG - prepStartIndex: ${prepStartIndex}, astuceIndex: ${astuceIndex}`);
    
    // Extraire les instructions entre "Préparation" et "Astuce"
    if (prepStartIndex !== -1 && astuceIndex !== -1) {
        for (let i = prepStartIndex + 1; i < astuceIndex; i++) {
            const trimmed = lines[i].trim();
            
            // Vérifier si la ligne commence par un verbe d'action ET a plus de 30 caractères
            const hasActionVerb = /^(Peler|Couper|Ajouter|Déposer|Mélanger|Mettre|Laisser|Écraser|Cuire|Faire|Prendre|Verser|Incorporer|Chauffer|Préchauffer|A l'aide)/i.test(trimmed);
            
            if (hasActionVerb && trimmed.length > 30) {
                result.instructions.push(trimmed);
                console.log(`✅ Instruction: ${trimmed.substring(0, 60)}...`);
            }
        }
    }
    
    console.log(`📊 ${result.instructions.length} instructions trouvées`);

    // Temps et portions
    const timeMatch = bodyText.match(/Préparation[^\d]*(\d+)\s*min/i);
    if (timeMatch) {
        result.temps_preparation = parseInt(timeMatch[1]);
        console.log(`✅ Temps préparation: ${result.temps_preparation} min`);
    }

    const cookMatch = bodyText.match(/Cuisson[^\d]*(\d+)\s*min/i);
    if (cookMatch) {
        result.temps_cuisson = parseInt(cookMatch[1]);
        console.log(`✅ Temps cuisson: ${result.temps_cuisson} min`);
    }

    const portionsMatch = bodyText.match(/(\d+)\s*personnes?/i);
    if (portionsMatch) {
        result.nombre_portions = parseInt(portionsMatch[1]);
        console.log(`✅ Portions: ${result.nombre_portions}`);
    }

    console.log(`📊 Résultat Tupperware: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    
    // Retourner les données seulement si on a au moins un titre et des instructions
    return result.titre && result.instructions.length > 0 ? result : null;
}