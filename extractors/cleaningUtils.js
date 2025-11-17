// extractors/cleaningUtils.js
// Utilitaires pour nettoyer et normaliser les données de recette

import { sanitizeText } from './sanitizer';

/**
 * Nettoie et formate les données de recette extraites
 * 
 * @param {Object} recipeData - Données brutes extraites
 * @param {string} url - URL source
 * @returns {Object} - Données nettoyées et formatées
 */
export function cleanRecipeData(recipeData, url) {
    const cleaned = {
        titre: cleanTitle(recipeData.titre),
        ingredients: cleanIngredients(recipeData.ingredients),
        instructions: cleanInstructions(recipeData.instructions),
        url_source: url,
        temps_preparation: recipeData.temps_preparation,
        temps_cuisson: recipeData.temps_cuisson,
        nombre_portions: recipeData.nombre_portions || 4,
        nombre_portions_original: recipeData.nombre_portions || 4,
        tags: cleanTags(recipeData.tags || []),
        est_favori: 0,
    };

    return cleaned;
}

/**
 * Nettoie le titre
 * Enlève les éléments non essentiels
 */
function cleanTitle(title) {
    if (!title) return '';

    // ✅ Sanitize d'abord
    let cleaned = sanitizeText(title);

    // Enlever les patterns courants
    cleaned = cleaned.replace(/\s*-\s*(Recette|Recipe).*/i, '');
    cleaned = cleaned.replace(/^Recette\s*:\s*/i, '');
    cleaned = cleaned.replace(/\s*\|.*$/, ''); // Enlever après |
    cleaned = cleaned.replace(/\s*-.*$/g, ''); // Enlever après -

    // Capitaliser la première lettre
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned.trim().substring(0, 200); // Limiter à 200 caractères
}

/**
 * Nettoie la liste des ingrédients
 */
function cleanIngredients(ingredients) {
    if (!Array.isArray(ingredients)) return [];

    return ingredients
        .map(ing => cleanIngredient(ing))
        .filter(ing => ing.ingredient.length > 0)
        .slice(0, 50); // Max 50 ingrédients
}

/**
 * Nettoie un ingrédient individuel
 */
function cleanIngredient(ingredient) {
    const cleaned = {
        quantite: cleanQuantity(ingredient.quantite),
        unite: cleanUnit(ingredient.unite),
        ingredient: cleanIngredientName(ingredient.ingredient),
    };

    return cleaned;
}

/**
 * Nettoie une quantité
 */
function cleanQuantity(quantity) {
    if (!quantity) return '';

    let cleaned = String(quantity).trim();
    
    // Remplacer virgule par point
    cleaned = cleaned.replace(',', '.');
    
    // Garder seulement chiffres et point
    cleaned = cleaned.replace(/[^\d.]/g, '');

    return cleaned;
}

/**
 * Normalise les unités de mesure
 */
function cleanUnit(unit) {
    if (!unit) return '';

    const unitMap = {
        // Grammes
        'gramme': 'g',
        'grammes': 'g',
        'gr': 'g',
        
        // Kilogrammes
        'kilogramme': 'kg',
        'kilogrammes': 'kg',
        'kilo': 'kg',
        
        // Litres
        'litre': 'l',
        'litres': 'l',
        
        // Millilitres
        'millilitre': 'ml',
        'millilitres': 'ml',
        
        // Centilitres
        'centilitre': 'cl',
        'centilitres': 'cl',
        
        // Cuillères
        'cuillère à soupe': 'c. à s.',
        'cuillères à soupe': 'c. à s.',
        'cuillere a soupe': 'c. à s.',
        'cuilleres a soupe': 'c. à s.',
        'cs': 'c. à s.',
        'cas': 'c. à s.',
        
        'cuillère à café': 'c. à c.',
        'cuillères à café': 'c. à c.',
        'cuillere a cafe': 'c. à c.',
        'cuilleres a cafe': 'c. à c.',
        'cc': 'c. à c.',
        'cac': 'c. à c.',
        
        // Autres
        'tasse': 'tasse',
        'tasses': 'tasse',
        'pincée': 'pincée',
        'pincees': 'pincée',
        'verre': 'verre',
        'verres': 'verre',
    };

    const normalized = unit.toLowerCase().trim();
    return unitMap[normalized] || unit.trim();
}

/**
 * Nettoie le nom d'un ingrédient
 */
function cleanIngredientName(name) {
    if (!name) return '';

    // ✅ Sanitize d'abord pour supprimer tout code malveillant
    let cleaned = sanitizeText(name);

    // Enlever les articles en début
    cleaned = cleaned.replace(/^(de |d'|du |de la |des |un |une )/i, '');

    // Nettoyer les parenthèses vides ou inutiles
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');

    // Enlever les doubles espaces
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim().substring(0, 100); // Max 100 caractères
}

/**
 * Nettoie les instructions
 */
function cleanInstructions(instructions) {
    if (!Array.isArray(instructions)) return [];

    return instructions
        .map(inst => cleanInstruction(inst))
        .filter(inst => inst.length > 5) // Min 5 caractères
        .slice(0, 30); // Max 30 étapes
}

/**
 * Nettoie une instruction
 */
function cleanInstruction(instruction) {
    if (!instruction) return '';

    // ✅ Sanitize d'abord
    let cleaned = sanitizeText(instruction);

    // Enlever les numéros au début
    cleaned = cleaned.replace(/^\d+\.\s*/, '');
    cleaned = cleaned.replace(/^(?:Étape|Step)\s*\d+\s*:?\s*/i, '');

    // Patterns à supprimer (publicité, SEO, etc.)
    const spamPatterns = [
        /Cliquez ici.*/i,
        /Inscrivez-vous.*/i,
        /Abonnez-vous.*/i,
        /Partagez.*/i,
        /Commentez.*/i,
        /Rejoignez.*/i,
        /Suivez-nous.*/i,
        /\[.*?\]/g, // Liens entre crochets
    ];

    for (const pattern of spamPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Nettoyer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Capitaliser la première lettre
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned.trim().substring(0, 1000); // Max 1000 caractères
}

/**
 * Nettoie les tags
 */
function cleanTags(tags) {
    if (!Array.isArray(tags)) return [];

    return tags
        .map(tag => String(tag).trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length < 30)
        .filter((tag, index, self) => self.indexOf(tag) === index) // Dédupliquer
        .slice(0, 10); // Max 10 tags
}

/**
 * Filtre le "blabla" non essentiel (histoires personnelles, etc.)
 */
export function removeFluff(text) {
    if (!text) return '';

    // Patterns de "blabla" à enlever
    const fluffPatterns = [
        // Histoires personnelles
        /(?:Quand j'étais|Lorsque j'étais|Je me souviens).{0,200}?\./gi,
        /(?:Mon mari|Ma mère|Ma grand-mère|Mon père).{0,200}?\./gi,
        
        // Intro SEO
        /(?:Vous cherchez|Vous voulez|Découvrez|Essayez).{0,100}?\./gi,
        /(?:Cette recette|Ce plat).{0,100}?est parfait.{0,100}?\./gi,
        
        // Call-to-action
        /(?:N'hésitez pas|N'oubliez pas|Pensez à).{0,100}?\./gi,
        /(?:Dites-moi|Laissez|Partagez).{0,100}?\./gi,
    ];

    let cleaned = text;
    for (const pattern of fluffPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}

/**
 * Valide que les données sont complètes et cohérentes
 */
export function validateRecipeData(recipe) {
    const errors = [];

    if (!recipe.titre || recipe.titre.length < 3) {
        errors.push('Titre manquant ou trop court');
    }

    if (!recipe.ingredients || recipe.ingredients.length < 2) {
        errors.push('Pas assez d\'ingrédients (minimum 2)');
    }

    if (!recipe.instructions || recipe.instructions.length < 2) {
        errors.push('Pas assez d\'instructions (minimum 2)');
    }

    // Vérifier que les ingrédients ont au moins un nom
    const validIngredients = recipe.ingredients.filter(ing => ing.ingredient && ing.ingredient.length > 0);
    if (validIngredients.length < 2) {
        errors.push('Ingrédients invalides');
    }

    // Vérifier que les instructions sont assez longues
    const validInstructions = recipe.instructions.filter(inst => inst && inst.length > 10);
    if (validInstructions.length < 2) {
        errors.push('Instructions trop courtes');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}