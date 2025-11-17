// extractors/sites/delicesdunenovice.js
// Règles d'extraction spécifiques pour Délices d'une Novice

export function extractDelicesDuneNovice(root) {
    console.log('🎯 extractDelicesDuneNovice appelée');
    
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

    // Portions - chercher "pour X personnes"
    const portionsMatch = contentElement.textContent.match(/pour\s+(\d+)\s+personnes?/i);
    if (portionsMatch) {
        result.nombre_portions = parseInt(portionsMatch[1]);
        console.log(`✅ Portions: ${result.nombre_portions}`);
    }

    // Ingrédients - dans les spans violets (#351c75)
    const purpleSpans = contentElement.querySelectorAll('span[style*="#351c75"], span[style*="#134f5c"]');
    console.log(`🔍 ${purpleSpans.length} spans colorés trouvés`);
    
    for (const span of purpleSpans) {
        const text = span.textContent.trim();
        
        // Séparer par virgules pour avoir tous les ingrédients
        const items = text.split(/,(?=\s*\d)/).map(s => s.trim());
        
        for (const item of items) {
            if (item.length > 5 && /\d/.test(item)) {
                result.ingredients.push(parseIngredient(item));
                console.log(`✅ Ingrédient: ${item.substring(0, 50)}...`);
            }
        }
    }

    // Instructions - dans les paragraphes "Préparation"
    const allParagraphs = contentElement.querySelectorAll('p[style*="text-align"]');
    
    let inInstructionsSection = false;
    for (const p of allParagraphs) {
        const text = p.textContent.trim();
        
        // Détecter le début de la section Préparation
        if (text.toLowerCase().includes('préparation')) {
            inInstructionsSection = true;
            console.log('🔍 Section Préparation trouvée');
            continue;
        }
        
        if (inInstructionsSection && text.length > 20) {
            // Les instructions peuvent contenir des <strike> ou <br>
            const html = p.innerHTML;
            const parts = html.split(/<strike>|<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, '').trim());
            
            for (const part of parts) {
                if (part.length > 20) {
                    result.instructions.push(part);
                    console.log(`✅ Instruction: ${part.substring(0, 50)}...`);
                }
            }
        }
    }

    console.log(`📊 Résultat DelicesDuneNovice: ${result.ingredients.length} ing, ${result.instructions.length} inst`);
    return result.ingredients.length > 0 || result.instructions.length > 0 ? result : null;
}

function parseIngredient(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-ZLgcl]+)?\s+(?:de |d')?(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3].trim(),
        };
    }
    
    return { quantite: '', unite: '', ingredient: cleaned };
}