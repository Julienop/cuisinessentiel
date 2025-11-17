// extractors/categoryDetector.js
// Détecte automatiquement la catégorie d'une recette

/**
 * Détecte la catégorie d'une recette basée sur son titre, ses tags et ses ingrédients
 * @param {Object} recipeData - Données de la recette
 * @returns {string} - Catégorie détectée (entrée, plat, dessert, snack, boisson, autre)
 */
export function detectCategory(recipeData) {
    const titre = (recipeData.titre || '').toLowerCase();
    const tags = (recipeData.tags || []).map(tag => tag.toLowerCase());
    const ingredients = (recipeData.ingredients || [])
        .map(ing => ing.ingredient ? ing.ingredient.toLowerCase() : '')
        .join(' ');
    
    // Combinaison de tout le texte à analyser
    const fullText = `${titre} ${tags.join(' ')} ${ingredients}`;
    
    // 1. ENTRÉES
    const entreeKeywords = [
        'entrée', 'hors-d\'œuvre', 'salade', 'soupe', 'velouté',
        'tartare', 'carpaccio', 'terrine', 'rillettes', 'tarte salée',
        'quiche', 'crêpe salée', 'toast', 'bruschetta', 'tapas',
        'antipasti', 'mezze', 'verrine', 'amuse-bouche', 'mise en bouche'
    ];
    
    // 2. PLATS PRINCIPAUX
    const platKeywords = [
        'plat', 'gratin', 'rôti', 'ragoût', 'curry', 'tajine',
        'lasagne', 'risotto', 'paella', 'couscous', 'pot-au-feu',
        'blanquette', 'bourguignon', 'chili', 'carbonara', 'bolognaise',
        'pizza', 'burger', 'sandwich', 'wrap', 'pâtes', 'riz',
        'poulet', 'bœuf', 'porc', 'agneau', 'poisson', 'saumon',
        'thon', 'cabillaud', 'crevette', 'moules', 'escalope'
    ];
    
    // 3. DESSERTS
    const dessertKeywords = [
        'dessert', 'gâteau', 'tarte', 'cake', 'brownie', 'cookie',
        'muffin', 'cupcake', 'mousse', 'tiramisu', 'crème', 'flan',
        'clafoutis', 'fondant', 'moelleux', 'biscuit', 'macaron',
        'éclair', 'mille-feuille', 'tarte aux pommes', 'cheesecake',
        'panna cotta', 'île flottante', 'crumble', 'compote', 'sorbet',
        'glace', 'chocolat', 'caramel', 'vanille', 'fraise', 'pomme dessert'
    ];
    
    // 4. SNACKS / GOÛTERS / APÉRITIFS
    const snackKeywords = [
        'snack', 'goûter', 'apéritif', 'apéro', 'dip', 'houmous',
        'guacamole', 'chips', 'crackers', 'cake salé', 'muffin salé',
        'barre', 'energy ball', 'granola', 'trail mix', 'pop-corn',
        'nachos', 'tzatziki', 'tapenade', 'anchoïade', 'caviar d\'aubergine'
    ];
    
    // 5. BOISSONS
    const boissonKeywords = [
        'boisson', 'jus', 'smoothie', 'milkshake', 'cocktail',
        'mocktail', 'limonade', 'thé glacé', 'café', 'chocolat chaud',
        'infusion', 'lassi', 'kéfir', 'kombucha', 'sangria'
    ];
    
    // Fonction de scoring
    const countMatches = (keywords) => {
        return keywords.reduce((count, keyword) => {
            return count + (fullText.includes(keyword) ? 1 : 0);
        }, 0);
    };
    
    // Calcul des scores
    const scores = {
        'entrée': countMatches(entreeKeywords),
        'plat': countMatches(platKeywords),
        'dessert': countMatches(dessertKeywords),
        'snack': countMatches(snackKeywords),
        'boisson': countMatches(boissonKeywords)
    };
    
    console.log('🏷️ Scores de catégorie:', scores);
    
    // Trouver la catégorie avec le score le plus élevé
    let maxScore = 0;
    let detectedCategory = 'autre';
    
    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detectedCategory = category;
        }
    }
    
    // Si aucun match, essayer une détection basique sur le titre uniquement
    if (maxScore === 0) {
        if (titre.includes('tarte') && !titre.includes('tarte salée')) {
            detectedCategory = 'dessert';
        } else if (titre.includes('tarte') && titre.includes('salée')) {
            detectedCategory = 'entrée';
        } else if (titre.includes('salade')) {
            detectedCategory = 'entrée';
        } else if (titre.includes('soupe') || titre.includes('velouté')) {
            detectedCategory = 'entrée';
        }
    }
    
    console.log(`✅ Catégorie détectée: ${detectedCategory}`);
    return detectedCategory;
}

/**
 * Emoji pour chaque catégorie
 */
export const CATEGORY_EMOJIS = {
    'entrée': '🥗',
    'plat': '🍽️',
    'dessert': '🍰',
    'snack': '🍿',
    'boisson': '🥤',
    'autre': '📋'
};

/**
 * Libellés français pour chaque catégorie
 */
export const CATEGORY_LABELS = {
    'entrée': 'Entrées',
    'plat': 'Plats',
    'dessert': 'Desserts',
    'snack': 'Snacks & Apéritifs',
    'boisson': 'Boissons',
    'autre': 'Autres'
};