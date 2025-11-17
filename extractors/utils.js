// extractors/utils.js
// Fonctions utilitaires communes pour l'extraction de recettes

/**
 * Liste des mots à ne pas couper lors du parsing
 * (mots qui peuvent commencer par une lettre d'unité comme "g", "l", etc.)
 */
const MOTS_A_PROTEGER = [
    // Commence par "g"
    'gousse', 'gousses', 'grosse', 'grosses',
    // Commence par "l"
    'litre', 'litres', // (déjà géré mais au cas où)
    // Commence par "c"
    'carotte', 'carottes', 'citron', 'citrons', 'concombre', 'concombres',
    // Commence par "b"
    'botte', 'bottes', 'branche', 'branches', 'bocal', 'bocaux', 'boîte', 'boîtes', 'boite', 'boites', 'bol', 'bols',
    // Commence par "t"
    'tranche', 'tranches', 'tasse', 'tasses', 'tomate', 'tomates',
    // Commence par "f"
    'feuille', 'feuilles', 'filet', 'filets',
    // Commence par "r"
    'rondelle', 'rondelles',
    // Commence par "p"
    'pincée', 'pincées', 'poignée', 'poignées', 'paquet', 'paquets', 'pot', 'pots', 'poivron', 'poivrons',
    // Commence par "s"
    'sachet', 'sachets',
    // Commence par "v"
    'verre', 'verres',
    // Commence par "z"
    'zeste', 'zestes',
];

/**
 * Parse un texte d'ingrédient en objet structuré
 * @param {string} text - Texte de l'ingrédient
 * @returns {Object} - Objet avec quantite, unite, ingredient
 */
export function parseIngredientText(text) {
    // Nettoyer le texte
    text = text.replace(/\s+/g, ' ').trim();

    // Regex pour capturer : quantité + unité + ingrédient
    // Ex: "250 g de farine" ou "3 cuillères à soupe d'huile"
    const patterns = [
        /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|cuillères?|c\.|tasses?|pincée[s]?|cs|cc)?\s*(?:de |d')?(.+)$/i,
        /^(\d+)\s*(.+)$/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const quantite = match[1] ? match[1].replace(',', '.') : '';
            let unite = match[2] ? match[2].trim() : '';
            let ingredient = match[3] ? match[3].trim() : match[2] || text;
            
            // CORRECTION : Vérifier si "unite" + début de "ingredient" forme un mot à protéger
            if (unite && ingredient) {
                const premierMotIngredient = ingredient.split(' ')[0].toLowerCase();
                const motReconstitue = (unite + premierMotIngredient).toLowerCase();
                
                // Chercher si le mot reconstitué correspond à un mot protégé
                const motProtege = MOTS_A_PROTEGER.find(mot => 
                    motReconstitue.startsWith(mot)
                );
                
                if (motProtege) {
                    // C'est un mot à protéger, ne pas le couper !
                    console.log(`🔒 Mot protégé détecté: "${unite}${premierMotIngredient}" -> "${motProtege}"`);
                    return {
                        quantite: quantite,
                        unite: '',
                        ingredient: unite + ingredient, // Reconstruire le mot complet
                    };
                }
            }
            
            return {
                quantite: quantite,
                unite: unite,
                ingredient: ingredient,
            };
        }
    }

    // Si pas de match, tout va dans l'ingrédient
    return {
        quantite: '',
        unite: '',
        ingredient: text,
    };
}

/**
 * Extrait un nombre de minutes depuis un texte
 * Ex: "30 minutes" -> 30, "1h30" -> 90
 * @param {string} text - Texte contenant une durée
 * @returns {number|null} - Nombre de minutes ou null
 */
export function extractMinutesFromText(text) {
    if (!text) return null;

    // Pattern "1h30" ou "1h 30min"
    const hoursMinMatch = text.match(/(\d+)\s*h(?:eure)?s?\s*(\d+)?/i);
    if (hoursMinMatch) {
        const hours = parseInt(hoursMinMatch[1]);
        const mins = hoursMinMatch[2] ? parseInt(hoursMinMatch[2]) : 0;
        return hours * 60 + mins;
    }

    // Pattern "30 minutes" ou "30min"
    const minsMatch = text.match(/(\d+)\s*min/i);
    if (minsMatch) {
        return parseInt(minsMatch[1]);
    }

    return null;
}

/**
 * Extrait un nombre depuis un texte
 * Ex: "4 personnes" -> 4
 * @param {string} text - Texte contenant un nombre
 * @returns {number|null} - Nombre extrait ou null
 */
export function extractNumberFromText(text) {
    if (!text) return null;
    
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}