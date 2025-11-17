// extractors/sites/carrefour.js
// Règles d'extraction spécifiques pour Carrefour

export function extractCarrefour(root) {
    console.log('🎯 extractCarrefour appelée');
    
    try {
        const htmlStr = root.toString();
        
        // Chercher juste "Beurre" (plus simple)
        const beurreIndex = htmlStr.indexOf('Beurre');
        console.log('Index "Beurre":', beurreIndex);
        
        if (beurreIndex > 0) {
            console.log('Contexte Beurre:', htmlStr.substring(beurreIndex, beurreIndex + 300));
        }
        
        // Chercher "brioche"
        const briocheIndex = htmlStr.indexOf('brioche');
        console.log('Index "brioche":', briocheIndex);
        
        if (briocheIndex > 0) {
            console.log('Contexte brioche:', htmlStr.substring(briocheIndex - 100, briocheIndex + 300));
        }
        
        // Chercher des patterns de classes
        console.log('Contient "grid"?:', htmlStr.includes('grid'));
        console.log('Contient "font-bold"?:', htmlStr.includes('font-bold'));
        
    } catch (e) {
        console.log('ERREUR:', e.message);
    }
    
    return null;
}

function parseIngredient(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([a-zéèêA-Zg]+)?\s+(.+)$/i);
    
    if (match) {
        return {
            quantite: match[1].replace(',', '.'),
            unite: match[2] || '',
            ingredient: match[3].trim(),
        };
    }
    
    return { quantite: '', unite: '', ingredient: cleaned };
}