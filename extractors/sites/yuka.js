// extractors/sites/yuka.js
// Règles d'extraction spécifiques pour yuka.io

import { parseIngredientText, extractMinutesFromText } from '../utils.js';

/**
 * Extrait une recette depuis yuka.io
 * @param {HTMLElement} root - Element root de node-html-parser
 * @returns {Object|null} - Données de recette ou null
 */
export function extractYuka(root) {
    console.log('🎯 extractYuka appelée');

    // === DEBUG : Voir ce qui est disponible ===
    console.log('🔍 DEBUG - Recherche du titre...');
    const h1s = root.querySelectorAll('h1');
    console.log(`🔍 DEBUG - Trouvé ${h1s.length} balises h1`);
    for (const h1 of h1s) {
        console.log(`  - h1: "${h1.textContent.substring(0, 50)}" | classes: ${h1.classList}`);
    }
    
    console.log('🔍 DEBUG - Recherche des listes ul...');
    const uls = root.querySelectorAll('ul');
    console.log(`🔍 DEBUG - Trouvé ${uls.length} balises ul`);
    for (let i = 0; i < Math.min(uls.length, 5); i++) {
        const ul = uls[i];
        console.log(`  - ul[${i}]: classes="${ul.classList}" | items=${ul.querySelectorAll('li').length}`);
    }
    
    console.log('🔍 DEBUG - Recherche des paragraphes avec class step...');
    const steps = root.querySelectorAll('p.step');
    console.log(`🔍 DEBUG - Trouvé ${steps.length} <p class="step">`);
    
    console.log('🔍 DEBUG - Recherche .entry-content...');
    const entryContent = root.querySelector('.entry-content');
    console.log(`🔍 DEBUG - entry-content trouvé: ${!!entryContent}`);
    // === FIN DEBUG ===
    
    const result = {
        titre: '',
        ingredients: [],
        instructions: [],
        temps_preparation: null,
        temps_cuisson: null,
        nombre_portions: null,
        tags: [],
    };

    // ===== TITRE =====
    const titleElement = root.querySelector('h1.yuka_recipe-title, h1.entry-title');
    if (titleElement) {
        result.titre = titleElement.textContent.trim();
        console.log('✅ Titre trouvé:', result.titre);
    }

    // ===== TEMPS TOTAL =====
    const timeElement = root.querySelector('.timespan');
    if (timeElement) {
        const timeText = timeElement.textContent.trim();
        const totalMinutes = extractMinutesFromText(timeText);
        if (totalMinutes) {
            // Yuka donne un temps total, on le met en préparation
            result.temps_preparation = totalMinutes;
            console.log(`✅ Temps total trouvé: ${totalMinutes} min`);
        }
    }

    // ===== INGRÉDIENTS =====
    // Les ingrédients sont dans des <ul class="wp-block-list">
    const ingredientLists = root.querySelectorAll('ul.wp-block-list');
    
    for (const list of ingredientLists) {
        const items = list.querySelectorAll('li');
        
        for (const item of items) {
            const text = item.textContent.trim();
            
            if (text && text.length > 0) {
                const parsed = parseIngredientText(text);
                result.ingredients.push(parsed);
            }
        }
    }
    
    console.log(`✅ ${result.ingredients.length} ingrédients trouvés`);

    // ===== INSTRUCTIONS =====
    // Les étapes sont dans des <p class="step"> suivis du texte
    const contentDiv = root.querySelector('.entry-content, .clearfix');
    
    if (contentDiv) {
        // Chercher toutes les étapes
        const steps = contentDiv.querySelectorAll('p.step');
        
        for (const step of steps) {
            // Le texte de l'instruction est dans le paragraphe suivant ou dans le parent
            let instructionText = '';
            
            // Méthode 1 : Chercher dans le parent direct
            const parentDiv = step.parentNode;
            if (parentDiv && parentDiv.classList && parentDiv.classList.contains('wp-block-media-text__content')) {
                // Récupérer tout le texte du parent sauf le numéro de l'étape
                const allText = parentDiv.textContent.trim();
                // Enlever le numéro d'étape (ex: "1:")
                instructionText = allText.replace(/^\d+\s*:\s*/, '').trim();
            }
            
            // Méthode 2 : Chercher le prochain élément de texte
            if (!instructionText) {
                let nextElement = step.nextElementSibling;
                while (nextElement && !instructionText) {
                    const text = nextElement.textContent.trim();
                    if (text && text.length > 10) {
                        instructionText = text;
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }
            }
            
            if (instructionText && instructionText.length > 5) {
                result.instructions.push(instructionText);
            }
        }
        
        // Si aucune instruction trouvée avec les <p class="step">, essayer une approche alternative
        if (result.instructions.length === 0) {
            console.log('⚠️ Méthode step échouée, essai méthode alternative...');
            
            // Chercher après un titre "Étapes" ou "Préparation"
            const headings = contentDiv.querySelectorAll('h2, h3, h4');
            
            for (const heading of headings) {
                const headingText = heading.textContent.trim().toLowerCase();
                
                if (headingText.includes('étape') || headingText.includes('préparation') || headingText.includes('recette')) {
                    // Récupérer tous les paragraphes après ce titre
                    let nextElement = heading.nextElementSibling;
                    
                    while (nextElement && result.instructions.length < 20) {
                        // Arrêter si on tombe sur un autre titre
                        if (nextElement.tagName === 'H2' || nextElement.tagName === 'H3' || nextElement.tagName === 'H4') {
                            break;
                        }
                        
                        // Si c'est un paragraphe avec du texte
                        if (nextElement.tagName === 'P') {
                            const text = nextElement.textContent.trim();
                            if (text.length > 10) {
                                result.instructions.push(text);
                            }
                        }
                        
                        // Si c'est une div contenant du texte
                        if (nextElement.tagName === 'DIV') {
                            const paragraphs = nextElement.querySelectorAll('p');
                            for (const p of paragraphs) {
                                const text = p.textContent.trim();
                                if (text.length > 10) {
                                    result.instructions.push(text);
                                }
                            }
                        }
                        
                        nextElement = nextElement.nextElementSibling;
                    }
                    
                    if (result.instructions.length > 0) {
                        break;
                    }
                }
            }
        }
    }
    
    console.log(`✅ ${result.instructions.length} instructions trouvées`);

    // ===== NOMBRE DE PORTIONS =====
    // Chercher dans le texte "pour X personnes" ou "X portions"
    const contentText = root.querySelector('.entry-content')?.textContent || '';
    const portionsMatch = contentText.match(/(\d+)\s*(?:personnes?|portions?)/i);
    if (portionsMatch) {
        result.nombre_portions = parseInt(portionsMatch[1]);
        console.log(`✅ Portions trouvées: ${result.nombre_portions}`);
    }

    // Retourner les données si au moins le titre et des ingrédients
    if (result.titre && result.ingredients.length > 0) {
        console.log('📊 Résultat Yuka: succès !');
        return result;
    }

    console.log('⚠️ Données Yuka incomplètes');
    return null;
}