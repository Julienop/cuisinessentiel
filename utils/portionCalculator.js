// utils/portionCalculator.js
// Utilitaire pour recalculer les quantités d'ingrédients selon le nombre de portions

/**
 * Parse un texte d'ingrédient contenant une fraction au début
 * Ex: "1/4 Oignon rouge" → { quantite: "1/4", reste: "Oignon rouge" }
 * Ex: "½ Orange" → { quantite: "0.5", reste: "Orange" }
 * @param {string} text - Texte de l'ingrédient
 * @returns {Object|null} - Objet avec quantite et reste, ou null si pas de fraction
 */
function parseIngredientWithFraction(text) {
    // Map des fractions unicode vers leurs valeurs décimales
    const unicodeFractions = {
        '¼': '0.25',
        '½': '0.5',
        '¾': '0.75',
        '⅓': '0.333',
        '⅔': '0.666',
        '⅕': '0.2',
        '⅖': '0.4',
        '⅗': '0.6',
        '⅘': '0.8',
        '⅙': '0.166',
        '⅚': '0.833',
        '⅛': '0.125',
        '⅜': '0.375',
        '⅝': '0.625',
        '⅞': '0.875'
    };
    
    // Vérifier d'abord les fractions unicode au début
    for (const [unicode, decimal] of Object.entries(unicodeFractions)) {
        if (text.startsWith(unicode)) {
            const reste = text.substring(unicode.length).trim();
            return {
                quantite: decimal,
                reste: reste
            };
        }
    }
    
    // Regex pour détecter fraction ou nombre mixte au début (format classique)
    const patterns = [
        /^(\d+\s+\d+\/\d+)\s+(.+)$/,  // "1 1/2 Oignon"
        /^(\d+\/\d+)\s+(.+)$/,         // "1/4 Oignon"
        // NOUVEAU : Détecter "1 5 kg" comme nombre décimal mal formaté
        /^(\d+)\s+(\d+)\s+(.+)$/,      // "1 5 kg" → interprété comme "1.5 kg"
        /^(\d+(?:\.\d+)?)\s+(.+)$/,    // "0.5 Oignon" ou "2 Oignons"
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // CAS SPÉCIAL : "1 5 kg" → convertir en "1.5"
            if (pattern.source === /^(\d+)\s+(\d+)\s+(.+)$/.source) {
                const entier = match[1];
                const decimale = match[2];
                return {
                    quantite: `${entier}.${decimale}`,
                    reste: match[3]
                };
            }
            
            return {
                quantite: match[1],
                reste: match[2]
            };
        }
    }
    
    return null;
}

/**
 * Convertit les fractions unicode en leur valeur décimale
 * @param {string} text - Texte contenant potentiellement des fractions unicode
 * @returns {Object} - { value: nombre décimal, hasUnicodeFraction: boolean }
 */
function parseUnicodeFraction(text) {
    const fractionMap = {
        '¼': 0.25,
        '½': 0.5,
        '¾': 0.75,
        '⅓': 0.333,
        '⅔': 0.666,
        '⅕': 0.2,
        '⅖': 0.4,
        '⅗': 0.6,
        '⅘': 0.8,
        '⅙': 0.166,
        '⅚': 0.833,
        '⅛': 0.125,
        '⅜': 0.375,
        '⅝': 0.625,
        '⅞': 0.875
    };
    
    // Chercher si le texte contient une fraction unicode
    for (const [fraction, value] of Object.entries(fractionMap)) {
        if (text.includes(fraction)) {
            return { value, fraction, hasUnicodeFraction: true };
        }
    }
    
    return { value: null, fraction: null, hasUnicodeFraction: false };
}

/**
 * Recalcule les quantités d'ingrédients pour un nouveau nombre de portions
 * @param {Array} ingredients - Liste des ingrédients originaux
 * @param {number} portionsOriginales - Nombre de portions original
 * @param {number} nouvellesPortions - Nouveau nombre de portions désiré
 * @returns {Array} - Liste des ingrédients avec quantités ajustées
 */
export function recalculateIngredients(ingredients, portionsOriginales, nouvellesPortions) {
    console.log('📊 ====== DÉBUT RECALCUL ======');
    console.log('📊 Nombre d\'ingrédients reçus:', ingredients?.length || 0);
    console.log('📊 TOUS les ingrédients:', JSON.stringify(ingredients, null, 2));
    console.log('📊 Portions:', portionsOriginales, '→', nouvellesPortions);
    console.log('📊 ==============================');
    
    if (!ingredients || ingredients.length === 0) {
        return [];
    }

    if (!portionsOriginales || portionsOriginales === 0) {
        return ingredients;
    }

    const ratio = nouvellesPortions / portionsOriginales;

    return ingredients.map(ingredient => {
        const quantite = ingredient.quantite;
        const unite = ingredient.unite || ''; // Récupérer l'unité

        // CAS SPÉCIAL : Si quantite est vide mais ingredient contient une fraction au début
        // Ex: ingredient = "1/4 Oignon rouge", quantite = "", unite = ""
        if ((!quantite || (typeof quantite === 'string' && quantite.trim() === '')) && ingredient.ingredient) {
            const parsed = parseIngredientWithFraction(ingredient.ingredient);
            
            if (parsed) {
                console.log(`🔍 Recalcul (fraction dans texte): "${ingredient.ingredient}" (ratio: ${ratio})`);
                
                // Traiter la quantité extraite
                const quantiteStr = parsed.quantite.trim();
                
                // Gérer les fractions (1/2, 1/4, 3/4, etc.)
                const fractionMatch = quantiteStr.match(/^(\d+)\/(\d+)$/);
                if (fractionMatch) {
                    const numerateur = parseInt(fractionMatch[1]);
                    const denominateur = parseInt(fractionMatch[2]);
                    const nouvelleQuantite = (numerateur / denominateur) * ratio;
                    const formattedQty = formatQuantity(nouvelleQuantite, unite);
                    console.log(`  ✅ Fraction ${numerateur}/${denominateur} × ${ratio} = ${nouvelleQuantite} → ${formattedQty}`);
                    
                    return {
                        ...ingredient,
                        ingredient: `${formattedQty} ${parsed.reste}`
                    };
                }
                
                // Gérer les nombres avec fractions (1 1/2, 2 1/4, etc.)
                const mixedMatch = quantiteStr.match(/^(\d+)\s+(\d+)\/(\d+)$/);
                if (mixedMatch) {
                    const entier = parseInt(mixedMatch[1]);
                    const numerateur = parseInt(mixedMatch[2]);
                    const denominateur = parseInt(mixedMatch[3]);
                    const valeur = entier + (numerateur / denominateur);
                    const nouvelleQuantite = valeur * ratio;
                    const formattedQty = formatQuantity(nouvelleQuantite, unite);
                    console.log(`  ✅ Fraction mixte ${entier} ${numerateur}/${denominateur} × ${ratio} = ${nouvelleQuantite} → ${formattedQty}`);
                    
                    return {
                        ...ingredient,
                        ingredient: `${formattedQty} ${parsed.reste}`
                    };
                }
                
                // Gérer les nombres décimaux
                const nombre = parseFloat(quantiteStr.replace(',', '.'));
                if (!isNaN(nombre)) {
                    const nouvelleQuantite = nombre * ratio;
                    const formattedQty = formatQuantity(nouvelleQuantite, unite);
                    console.log(`  ✅ Nombre ${nombre} × ${ratio} = ${nouvelleQuantite} → ${formattedQty}`);
                    
                    return {
                        ...ingredient,
                        ingredient: `${formattedQty} ${parsed.reste}`
                    };
                }
            }
        }

        // Si la quantité est vide et qu'on n'a pas pu parser, retourner tel quel
        if (!quantite || (typeof quantite === 'string' && quantite.trim() === '')) {
            return ingredient;
        }

        // Convertir en string si c'est un nombre
        const quantiteStr = quantite.toString().trim();

        // Log pour débugger
        console.log(`🔍 Recalcul: "${quantiteStr}" ${unite} (ratio: ${ratio})`);

        // NOUVEAU : Gérer les fractions unicode (½, ¼, ¾, etc.)
        const unicodeFractionResult = parseUnicodeFraction(quantiteStr);
        if (unicodeFractionResult.hasUnicodeFraction) {
            const nouvelleQuantite = unicodeFractionResult.value * ratio;
            console.log(`  ✅ Fraction unicode détectée: ${unicodeFractionResult.fraction} = ${unicodeFractionResult.value} × ${ratio} = ${nouvelleQuantite}`);
            return {
                ...ingredient,
                quantite: formatQuantity(nouvelleQuantite, unite)
            };
        }

        // Gérer les fractions (1/2, 1/4, 3/4, etc.)
        const fractionMatch = quantiteStr.match(/^(\d+)\/(\d+)$/);
        if (fractionMatch) {
            const numerateur = parseInt(fractionMatch[1]);
            const denominateur = parseInt(fractionMatch[2]);
            const nouvelleQuantite = (numerateur / denominateur) * ratio;
            console.log(`  ✅ Fraction détectée: ${numerateur}/${denominateur} = ${numerateur/denominateur} × ${ratio} = ${nouvelleQuantite}`);
            return {
                ...ingredient,
                quantite: formatQuantity(nouvelleQuantite, unite)
            };
        }

        // Gérer les nombres avec fractions (1 1/2, 2 1/4, etc.)
        const mixedMatch = quantiteStr.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
            const entier = parseInt(mixedMatch[1]);
            const numerateur = parseInt(mixedMatch[2]);
            const denominateur = parseInt(mixedMatch[3]);
            const valeur = entier + (numerateur / denominateur);
            const nouvelleQuantite = valeur * ratio;
            console.log(`  ✅ Fraction mixte détectée: ${entier} ${numerateur}/${denominateur} = ${valeur} × ${ratio} = ${nouvelleQuantite}`);
            return {
                ...ingredient,
                quantite: formatQuantity(nouvelleQuantite, unite)
            };
        }

        // Gérer les plages (200-250, 2-3, etc.)
        const rangeMatch = quantiteStr.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            const newMin = min * ratio;
            const newMax = max * ratio;
            console.log(`  ✅ Plage détectée: ${min}-${max} × ${ratio} = ${newMin}-${newMax}`);
            return {
                ...ingredient,
                quantite: `${formatQuantity(newMin, unite)}-${formatQuantity(newMax, unite)}`
            };
        }

        // Gérer les nombres décimaux mal formatés (1 5 = 1.5)
        const malFormattedMatch = quantiteStr.match(/^(\d+)\s+(\d+)$/);
        if (malFormattedMatch) {
            const entier = parseInt(malFormattedMatch[1]);
            const decimale = parseInt(malFormattedMatch[2]);
            const nombre = parseFloat(`${entier}.${decimale}`);
            const nouvelleQuantite = nombre * ratio;
            console.log(`  ✅ Nombre mal formaté détecté: ${entier} ${decimale} = ${nombre} × ${ratio} = ${nouvelleQuantite}`);
            return {
                ...ingredient,
                quantite: formatQuantity(nouvelleQuantite, unite)
            };
        }

        // Gérer les nombres décimaux standards
        const nombre = parseFloat(quantiteStr.replace(',', '.'));
        if (!isNaN(nombre)) {
            const nouvelleQuantite = nombre * ratio;
            console.log(`  ✅ Nombre détecté: ${nombre} × ${ratio} = ${nouvelleQuantite}`);
            return {
                ...ingredient,
                quantite: formatQuantity(nouvelleQuantite, unite)
            };
        }

        // Si on ne peut pas parser, retourner tel quel
        console.log(`  ⚠️ Non parsable, retour tel quel`);
        return ingredient;
    });
}

/**
 * Formate une quantité numérique de manière lisible
 * @param {number} quantity - Quantité à formater
 * @param {string} unit - Unité de mesure (optionnel)
 * @returns {string} - Quantité formatée
 */
function formatQuantity(quantity, unit = '') {
    // Liste des unités "grandes" qui méritent des décimales
    const unitesAvecDecimales = [
        // Grandes unités
        'kg', 'kilogramme', 'kilogrammes', 
        'l', 'litre', 'litres',
        
        // Cuillères
        'c. à s.', 'c. à c.', 'c.à.s.', 'c.à.c.',
        'cs', 'cc', 'càs', 'càc',
        'cuillère à soupe', 'cuillère à café',
        'cuillères à soupe', 'cuillères à café',
        
        // Petites mesures
        'pincée', 'pincee', 'poignée', 'poignee',
        'trait', 'filet', 'noix', 'tour de moulin',
        
        // Éléments unitaires
        'gousse', 'botte', 'bouquet',
        'branche', 'feuille',
        'tranche', 'rondelle', 'zeste',
        
        // Contenants
        'boîte', 'boite', 'sachet', 'paquet',
        'pot', 'bocal', 'verre', 'tasse', 'bol'
    ];
    
    // Liste des unités "petites" qui ne méritent PAS de décimales
    const unitesSansDecimales = ['g', 'gramme', 'grammes', 'ml', 'millilitre', 'cl', 'centilitre', 'dl', 'décilitre'];
    
    // Vérifier le type d'unité
    const uniteLower = unit.toLowerCase().trim();
    
    // Si l'unité est explicitement "petite" → pas de décimales
    const estPetiteUnite = unitesSansDecimales.some(u => uniteLower.includes(u));
    if (estPetiteUnite) {
        return Math.round(quantity).toString();
    }
    
    // Si l'unité est "grande" OU si c'est une unité unitaire/vide (œufs, pièces, etc.)
    // → garder 1 décimale si nécessaire
    const estGrandeUnite = unitesAvecDecimales.some(u => uniteLower.includes(u));
    const estUniteUnitaire = uniteLower === '' || 
                             uniteLower.includes('pièce') || 
                             uniteLower.includes('unité') ||
                             uniteLower.includes('œuf') ||
                             uniteLower.includes('oeuf');
    
    if (estGrandeUnite || estUniteUnitaire) {
        // Garder 1 décimale si nécessaire
        const rounded = Math.round(quantity * 10) / 10;
        
        // Si c'est un nombre entier, pas de décimales
        if (rounded === Math.floor(rounded)) {
            return rounded.toString();
        }
        
        // Sinon, retourner avec 1 décimale
        return rounded.toFixed(1);
    }
    
    // Par défaut : arrondir sans décimales
    return Math.round(quantity).toString();
}

/**
 * Options de portions prédéfinies pour le sélecteur
 */
export const PORTION_OPTIONS = [1, 2, 4, 6, 8, 10, 12];