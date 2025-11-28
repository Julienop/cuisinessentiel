// extractors/categoryDetector.js
// Détecte automatiquement la catégorie d'une recette (version améliorée)

/**
 * Mots-clés avec pondération par catégorie
 * weight: importance du mot (1-3)
 * exclusive: si true, ce mot est très spécifique à cette catégorie
 */
const CATEGORY_RULES = {
    'entrée': {
        keywords: [
            // Très spécifiques (poids 3)
            { word: 'entrée', weight: 3, exclusive: true },
            { word: 'hors-d\'œuvre', weight: 3, exclusive: true },
            { word: 'hors d\'œuvre', weight: 3, exclusive: true },
            { word: 'amuse-bouche', weight: 3, exclusive: true },
            { word: 'mise en bouche', weight: 3, exclusive: true },
            { word: 'verrine salée', weight: 3, exclusive: true },
            { word: 'antipasti', weight: 3, exclusive: true },
            { word: 'mezze', weight: 3, exclusive: true },
            { word: 'tapas', weight: 3, exclusive: true },
            
            // Spécifiques (poids 2)
            { word: 'velouté', weight: 2 },
            { word: 'soupe', weight: 2 },
            { word: 'potage', weight: 2 },
            { word: 'bouillon', weight: 2 },
            { word: 'gaspacho', weight: 2 },
            { word: 'minestrone', weight: 2 },
            { word: 'carpaccio', weight: 2 },
            { word: 'tartare de bœuf', weight: 2 },
            { word: 'tartare de saumon', weight: 2 },
            { word: 'terrine', weight: 2 },
            { word: 'pâté', weight: 2 },
            { word: 'rillettes', weight: 2 },
            { word: 'mousse de canard', weight: 2 },
            { word: 'mousse de foie', weight: 2 },
            { word: 'œuf mimosa', weight: 2 },
            { word: 'œufs mayo', weight: 2 },
            { word: 'avocat farci', weight: 2 },
            { word: 'tomate farcie froide', weight: 2 },
            { word: 'bruschetta', weight: 2 },
            { word: 'crostini', weight: 2 },
            
            // Génériques (poids 1)
            { word: 'salade', weight: 1 },
            { word: 'toast', weight: 1 },
            { word: 'feuilleté', weight: 1 },
        ],
        // Mots qui excluent cette catégorie
        negativeKeywords: ['salade de fruits', 'salade sucrée', 'dessert']
    },
    
    'plat': {
        keywords: [
            // Très spécifiques (poids 3)
            { word: 'plat principal', weight: 3, exclusive: true },
            { word: 'plat de résistance', weight: 3, exclusive: true },
            { word: 'blanquette', weight: 3, exclusive: true },
            { word: 'bourguignon', weight: 3, exclusive: true },
            { word: 'bœuf bourguignon', weight: 3, exclusive: true },
            { word: 'coq au vin', weight: 3, exclusive: true },
            { word: 'pot-au-feu', weight: 3, exclusive: true },
            { word: 'cassoulet', weight: 3, exclusive: true },
            { word: 'choucroute', weight: 3, exclusive: true },
            { word: 'osso buco', weight: 3, exclusive: true },
            { word: 'bœuf stroganoff', weight: 3, exclusive: true },
            { word: 'carbonnade', weight: 3, exclusive: true },
            { word: 'navarin', weight: 3, exclusive: true },
            { word: 'tajine', weight: 3, exclusive: true },
            { word: 'couscous', weight: 3, exclusive: true },
            { word: 'paella', weight: 3, exclusive: true },
            { word: 'risotto', weight: 3, exclusive: true },
            { word: 'lasagne', weight: 3, exclusive: true },
            { word: 'lasagnes', weight: 3, exclusive: true },
            { word: 'moussaka', weight: 3, exclusive: true },
            { word: 'hachis parmentier', weight: 3, exclusive: true },
            { word: 'parmentier', weight: 3, exclusive: true },
            { word: 'gratin dauphinois', weight: 3, exclusive: true },
            { word: 'raclette', weight: 3, exclusive: true },
            { word: 'tartiflette', weight: 3, exclusive: true },
            { word: 'fondue', weight: 3, exclusive: true },
            { word: 'chili con carne', weight: 3, exclusive: true },
            { word: 'bolognaise', weight: 3, exclusive: true },
            { word: 'carbonara', weight: 3, exclusive: true },
            { word: 'amatriciana', weight: 3, exclusive: true },
            
            // Spécifiques (poids 2)
            { word: 'rôti', weight: 2 },
            { word: 'gigot', weight: 2 },
            { word: 'côte de bœuf', weight: 2 },
            { word: 'côte de porc', weight: 2 },
            { word: 'magret', weight: 2 },
            { word: 'canard', weight: 2 },
            { word: 'dinde', weight: 2 },
            { word: 'escalope', weight: 2 },
            { word: 'cordon bleu', weight: 2 },
            { word: 'steak', weight: 2 },
            { word: 'entrecôte', weight: 2 },
            { word: 'filet mignon', weight: 2 },
            { word: 'brochette', weight: 2 },
            { word: 'grillade', weight: 2 },
            { word: 'barbecue', weight: 2 },
            { word: 'bbq', weight: 2 },
            { word: 'wok', weight: 2 },
            { word: 'sauté de', weight: 2 },
            { word: 'émincé de', weight: 2 },
            { word: 'mijoté', weight: 2 },
            { word: 'ragoût', weight: 2 },
            { word: 'curry', weight: 2 },
            { word: 'poulet rôti', weight: 2 },
            { word: 'poulet grillé', weight: 2 },
            { word: 'fish and chips', weight: 2 },
            { word: 'poisson pané', weight: 2 },
            { word: 'saumon grillé', weight: 2 },
            { word: 'saumon en croûte', weight: 2 },
            { word: 'cabillaud', weight: 2 },
            { word: 'daurade', weight: 2 },
            { word: 'lotte', weight: 2 },
            { word: 'moules frites', weight: 2 },
            { word: 'moules marinières', weight: 2 },
            { word: 'crevettes sautées', weight: 2 },
            { word: 'gambas', weight: 2 },
            { word: 'pad thaï', weight: 2 },
            { word: 'pad thai', weight: 2 },
            { word: 'nems', weight: 2 },
            { word: 'rouleaux de printemps', weight: 2 },
            { word: 'bo bun', weight: 2 },
            { word: 'bobun', weight: 2 },
            { word: 'sushi', weight: 2 },
            { word: 'poke bowl', weight: 2 },
            { word: 'bowl', weight: 2 },
            { word: 'buddha bowl', weight: 2 },
            { word: 'gratin', weight: 2 },
            
            // Génériques (poids 1)
            { word: 'pâtes', weight: 1 },
            { word: 'spaghetti', weight: 1 },
            { word: 'tagliatelle', weight: 1 },
            { word: 'penne', weight: 1 },
            { word: 'pizza', weight: 1 },
            { word: 'burger', weight: 1 },
            { word: 'hamburger', weight: 1 },
            { word: 'quiche', weight: 1 },
            { word: 'tarte salée', weight: 1 },
            { word: 'tourte', weight: 1 },
            { word: 'crêpe salée', weight: 1 },
            { word: 'galette bretonne', weight: 1 },
            { word: 'galette complète', weight: 1 },
            { word: 'omelette', weight: 1 },
            { word: 'frittata', weight: 1 },
            { word: 'wrap', weight: 1 },
            { word: 'tacos', weight: 1 },
            { word: 'burrito', weight: 1 },
            { word: 'fajitas', weight: 1 },
            { word: 'poulet', weight: 1 },
            { word: 'bœuf', weight: 1 },
            { word: 'porc', weight: 1 },
            { word: 'agneau', weight: 1 },
            { word: 'veau', weight: 1 },
            { word: 'poisson', weight: 1 },
            { word: 'saumon', weight: 1 },
            { word: 'thon', weight: 1 },
            { word: 'riz', weight: 1 },
        ],
        negativeKeywords: ['dessert', 'gâteau', 'sucré', 'crème dessert']
    },
    
    'dessert': {
        keywords: [
            // Très spécifiques (poids 3)
            { word: 'dessert', weight: 3, exclusive: true },
            { word: 'gâteau', weight: 3, exclusive: true },
            { word: 'tiramisu', weight: 3, exclusive: true },
            { word: 'cheesecake', weight: 3, exclusive: true },
            { word: 'fondant au chocolat', weight: 3, exclusive: true },
            { word: 'moelleux au chocolat', weight: 3, exclusive: true },
            { word: 'coulant', weight: 3, exclusive: true },
            { word: 'brownie', weight: 3, exclusive: true },
            { word: 'cookie', weight: 3, exclusive: true },
            { word: 'cookies', weight: 3, exclusive: true },
            { word: 'muffin sucré', weight: 3, exclusive: true },
            { word: 'cupcake', weight: 3, exclusive: true },
            { word: 'macaron', weight: 3, exclusive: true },
            { word: 'éclair', weight: 3, exclusive: true },
            { word: 'profiterole', weight: 3, exclusive: true },
            { word: 'paris-brest', weight: 3, exclusive: true },
            { word: 'mille-feuille', weight: 3, exclusive: true },
            { word: 'millefeuille', weight: 3, exclusive: true },
            { word: 'opéra', weight: 3, exclusive: true },
            { word: 'forêt noire', weight: 3, exclusive: true },
            { word: 'forêt-noire', weight: 3, exclusive: true },
            { word: 'fraisier', weight: 3, exclusive: true },
            { word: 'charlotte', weight: 3, exclusive: true },
            { word: 'bûche', weight: 3, exclusive: true },
            { word: 'baba au rhum', weight: 3, exclusive: true },
            { word: 'île flottante', weight: 3, exclusive: true },
            { word: 'crème brûlée', weight: 3, exclusive: true },
            { word: 'crème caramel', weight: 3, exclusive: true },
            { word: 'panna cotta', weight: 3, exclusive: true },
            { word: 'pannacotta', weight: 3, exclusive: true },
            { word: 'crème anglaise', weight: 3, exclusive: true },
            { word: 'mousse au chocolat', weight: 3, exclusive: true },
            { word: 'mousse aux fruits', weight: 3, exclusive: true },
            { word: 'bavarois', weight: 3, exclusive: true },
            { word: 'entremet', weight: 3, exclusive: true },
            { word: 'verrine sucrée', weight: 3, exclusive: true },
            { word: 'salade de fruits', weight: 3, exclusive: true },
            { word: 'tarte tatin', weight: 3, exclusive: true },
            { word: 'tarte aux pommes', weight: 3, exclusive: true },
            { word: 'tarte au citron', weight: 3, exclusive: true },
            { word: 'tarte aux fraises', weight: 3, exclusive: true },
            { word: 'tarte au chocolat', weight: 3, exclusive: true },
            { word: 'tartelette', weight: 3, exclusive: true },
            
            // Spécifiques (poids 2)
            { word: 'flan', weight: 2 },
            { word: 'clafoutis', weight: 2 },
            { word: 'far breton', weight: 2 },
            { word: 'crumble', weight: 2 },
            { word: 'compote', weight: 2 },
            { word: 'crêpe sucrée', weight: 2 },
            { word: 'crêpes suzette', weight: 2 },
            { word: 'gaufre', weight: 2 },
            { word: 'pancake', weight: 2 },
            { word: 'french toast', weight: 2 },
            { word: 'pain perdu', weight: 2 },
            { word: 'brioche', weight: 2 },
            { word: 'croissant', weight: 2 },
            { word: 'pain au chocolat', weight: 2 },
            { word: 'viennoiserie', weight: 2 },
            { word: 'beignet', weight: 2 },
            { word: 'churros', weight: 2 },
            { word: 'glace', weight: 2 },
            { word: 'sorbet', weight: 2 },
            { word: 'parfait glacé', weight: 2 },
            { word: 'granité', weight: 2 },
            { word: 'meringue', weight: 2 },
            { word: 'pavlova', weight: 2 },
            { word: 'sablé', weight: 2 },
            { word: 'financier', weight: 2 },
            { word: 'madeleine', weight: 2 },
            { word: 'cannelé', weight: 2 },
            { word: 'kouign-amann', weight: 2 },
            { word: 'riz au lait', weight: 2 },
            { word: 'semoule au lait', weight: 2 },
            { word: 'pudding', weight: 2 },
            { word: 'bread pudding', weight: 2 },
            
            // Génériques (poids 1)
            { word: 'chocolat', weight: 1 },
            { word: 'caramel', weight: 1 },
            { word: 'vanille', weight: 1 },
            { word: 'fraise', weight: 1 },
            { word: 'framboise', weight: 1 },
            { word: 'myrtille', weight: 1 },
            { word: 'citron', weight: 1 },
            { word: 'pomme', weight: 1 },
            { word: 'poire', weight: 1 },
            { word: 'sucré', weight: 1 },
            { word: 'tarte', weight: 1 },
            { word: 'cake', weight: 1 },
            { word: 'muffin', weight: 1 },
            { word: 'biscuit', weight: 1 },
            { word: 'crème', weight: 1 },
            { word: 'mousse', weight: 1 },
        ],
        negativeKeywords: ['salé', 'tarte salée', 'cake salé', 'muffin salé', 'crème fraîche']
    },
    
    'snack': {
        keywords: [
            // Très spécifiques (poids 3)
            { word: 'apéritif', weight: 3, exclusive: true },
            { word: 'apéro', weight: 3, exclusive: true },
            { word: 'amuse-gueule', weight: 3, exclusive: true },
            { word: 'snack', weight: 3, exclusive: true },
            { word: 'grignotage', weight: 3, exclusive: true },
            
            // Spécifiques (poids 2)
            { word: 'houmous', weight: 2 },
            { word: 'hummus', weight: 2 },
            { word: 'guacamole', weight: 2 },
            { word: 'tzatziki', weight: 2 },
            { word: 'tapenade', weight: 2 },
            { word: 'caviar d\'aubergine', weight: 2 },
            { word: 'baba ganoush', weight: 2 },
            { word: 'dip', weight: 2 },
            { word: 'sauce apéro', weight: 2 },
            { word: 'chips maison', weight: 2 },
            { word: 'crackers', weight: 2 },
            { word: 'gressins', weight: 2 },
            { word: 'blinis', weight: 2 },
            { word: 'mini pizza', weight: 2 },
            { word: 'mini quiche', weight: 2 },
            { word: 'feuilleté apéro', weight: 2 },
            { word: 'palmier salé', weight: 2 },
            { word: 'cake salé', weight: 2 },
            { word: 'muffin salé', weight: 2 },
            { word: 'gougères', weight: 2 },
            { word: 'nachos', weight: 2 },
            { word: 'pop-corn', weight: 2 },
            { word: 'popcorn', weight: 2 },
            { word: 'energy ball', weight: 2 },
            { word: 'energy balls', weight: 2 },
            { word: 'barre énergétique', weight: 2 },
            { word: 'granola', weight: 2 },
            { word: 'trail mix', weight: 2 },
            
            // Génériques (poids 1)
            { word: 'goûter', weight: 1 },
            { word: 'encas', weight: 1 },
            { word: 'en-cas', weight: 1 },
        ],
        negativeKeywords: []
    },
    
    'boisson': {
        keywords: [
            // Très spécifiques (poids 3)
            { word: 'boisson', weight: 3, exclusive: true },
            { word: 'cocktail', weight: 3, exclusive: true },
            { word: 'mocktail', weight: 3, exclusive: true },
            { word: 'smoothie', weight: 3, exclusive: true },
            { word: 'milkshake', weight: 3, exclusive: true },
            { word: 'milk-shake', weight: 3, exclusive: true },
            { word: 'frappé', weight: 3, exclusive: true },
            { word: 'frappuccino', weight: 3, exclusive: true },
            { word: 'limonade', weight: 3, exclusive: true },
            { word: 'citronnade', weight: 3, exclusive: true },
            { word: 'orangeade', weight: 3, exclusive: true },
            { word: 'thé glacé', weight: 3, exclusive: true },
            { word: 'ice tea', weight: 3, exclusive: true },
            { word: 'sangria', weight: 3, exclusive: true },
            { word: 'mojito', weight: 3, exclusive: true },
            { word: 'spritz', weight: 3, exclusive: true },
            { word: 'punch', weight: 3, exclusive: true },
            
            // Spécifiques (poids 2)
            { word: 'jus', weight: 2 },
            { word: 'jus de fruits', weight: 2 },
            { word: 'jus vert', weight: 2 },
            { word: 'infusion', weight: 2 },
            { word: 'tisane', weight: 2 },
            { word: 'chocolat chaud', weight: 2 },
            { word: 'café glacé', weight: 2 },
            { word: 'latte', weight: 2 },
            { word: 'cappuccino', weight: 2 },
            { word: 'chai latte', weight: 2 },
            { word: 'golden milk', weight: 2 },
            { word: 'lait d\'or', weight: 2 },
            { word: 'lassi', weight: 2 },
            { word: 'kéfir', weight: 2 },
            { word: 'kombucha', weight: 2 },
            { word: 'sirop', weight: 2 },
            { word: 'eau aromatisée', weight: 2 },
            { word: 'detox water', weight: 2 },
        ],
        negativeKeywords: []
    }
};

/**
 * Détecte la catégorie d'une recette basée sur son titre, ses tags et ses ingrédients
 * @param {Object} recipeData - Données de la recette
 * @returns {string} - Catégorie détectée (entrée, plat, dessert, snack, boisson, autre)
 */
export function detectCategory(recipeData) {
    const titre = (recipeData.titre || '').toLowerCase().trim();
    const tags = (recipeData.tags || []).map(tag => tag.toLowerCase().trim());
    const ingredients = (recipeData.ingredients || [])
        .map(ing => ing.ingredient ? ing.ingredient.toLowerCase().trim() : '')
        .filter(Boolean);
    
    // Textes à analyser avec priorités différentes
    const titreText = titre;
    const tagsText = tags.join(' ');
    const ingredientsText = ingredients.join(' ');
    
    console.log('🏷️ Analyse catégorie pour:', titre);
    
    // Calcul des scores par catégorie
    const scores = {};
    
    for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
        let score = 0;
        
        // Vérifier d'abord les mots-clés négatifs
        const hasNegative = rules.negativeKeywords.some(neg => 
            titreText.includes(neg) || tagsText.includes(neg)
        );
        
        if (hasNegative) {
            scores[category] = -10; // Score négatif pour exclure
            continue;
        }
        
        // Calculer le score avec les mots-clés
        for (const keywordRule of rules.keywords) {
            const word = keywordRule.word;
            const weight = keywordRule.weight;
            
            // Priorité au titre (multiplicateur x3)
            if (titreText.includes(word)) {
                score += weight * 3;
                if (keywordRule.exclusive) {
                    score += 5; // Bonus pour mot exclusif
                }
            }
            
            // Tags (multiplicateur x2)
            if (tagsText.includes(word)) {
                score += weight * 2;
            }
            
            // Ingrédients (multiplicateur x1, seulement pour poids >= 2)
            if (weight >= 2 && ingredientsText.includes(word)) {
                score += weight * 0.5;
            }
        }
        
        scores[category] = score;
    }
    
    console.log('📊 Scores de catégorie:', scores);
    
    // Trouver la catégorie avec le meilleur score
    let maxScore = 0;
    let detectedCategory = 'autre';
    
    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detectedCategory = category;
        }
    }
    
    // Si score trop faible, faire une détection de secours basée uniquement sur le titre
    if (maxScore < 2) {
        detectedCategory = fallbackDetection(titre);
    }
    
    console.log(`✅ Catégorie détectée: ${detectedCategory} (score: ${maxScore})`);
    return detectedCategory;
}

/**
 * Détection de secours basée sur des patterns simples
 */
function fallbackDetection(titre) {
    // Patterns très basiques pour les cas non détectés
    
    // Boissons
    if (/\b(jus|smoothie|cocktail|boisson|thé|café|lait)\b/i.test(titre)) {
        return 'boisson';
    }
    
    // Desserts
    if (/\b(gâteau|tarte|mousse|crème|glace|biscuit|cookie|sucr)/i.test(titre)) {
        return 'dessert';
    }
    
    // Entrées
    if (/\b(soupe|velouté|salade|entrée)/i.test(titre)) {
        // Mais pas "salade de fruits"
        if (titre.includes('fruit')) {
            return 'dessert';
        }
        return 'entrée';
    }
    
    // Snacks
    if (/\b(apéro|apéritif|snack|dip)/i.test(titre)) {
        return 'snack';
    }
    
    // Par défaut, si contient une protéine ou un féculent, c'est probablement un plat
    if (/\b(poulet|bœuf|porc|agneau|poisson|saumon|pâtes|riz|gratin|rôti)/i.test(titre)) {
        return 'plat';
    }
    
    return 'autre';
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