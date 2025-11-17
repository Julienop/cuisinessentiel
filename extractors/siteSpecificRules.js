// extractors/siteSpecificRules.js
// Orchestrateur pour les règles d'extraction spécifiques par site

// Import de tous les extracteurs de sites
import { extractMarmiton } from './sites/marmiton.js';
import { extract750g } from './sites/750g.js';
import { extractCuisineAZ } from './sites/cuisineaz.js';
import { extractRecettesDeCuisine } from './sites/recettesdecuisine.js';
import { extractCuisineActuelle } from './sites/cuisineactuelle.js';
import { extractWordPressRecipe } from './sites/wordpressRecipe.js';
import { extractMagimix } from './sites/magimix.js';
import { extractJow } from './sites/jow.js';
import { extractCookomix } from './sites/cookomix.js';
import { extractPapillesetpupilles } from './sites/papillesetpupilles.js';
import { extractPainsjacquet } from './sites/painsjacquet.js';
import { extractHelloFresh } from './sites/hellofresh.js';
import { extractYuka } from './sites/yuka.js';
import { extractTupperware } from './sites/tupperware.js';
import { extractAuFilDuThym } from './sites/aufilduthym.js';
import { extractChefnini } from './sites/chefnini';
// import { extractUnDejeunerDeSoleil } from './sites/undejeunerdesoleil.js';
import { extractLaCuisineDeDey } from './sites/lacuisinededey.js';
import { extractBlogspot } from './sites/blogspot.js';
import { extractAuxDelicesDuPalais } from './sites/auxdelicesdupalais.js';
import { extractUnDejeunerDeSoleil } from './sites/undejeunerdesoleil.js';
import { extractLesFoodies } from './sites/lesfoodies.js';
import { extractDelicesDuneNovice } from './sites/delicesdunenovice.js';
import { extractAmandineCooking } from './sites/amandinecooking.js';
// import { extractCarrefour } from './sites/carrefour.js';
import { extractVeganPratique } from './sites/veganpratique.js';

/**
 * Détecte si le site utilise un plugin WordPress de recettes
 * @param {HTMLElement} root 
 * @returns {boolean}
 */
function isWordPressRecipeSite(root) {
    const wordpressPluginSelectors = [
        '.wprm-recipe',                    // WP Recipe Maker
        '.wprm-recipe-container',
        '[class*="wprm-"]',
        '.tasty-recipes',                  // Tasty Recipes
        '.tasty-recipe',
        '.easyrecipe',                     // EasyRecipe
        '.ziprecipe',                      // Zip Recipes
        '.mv-create-card',                 // Mediavine Create
        '.wp-block-mediavine-create',
        '.cooked-recipe',                  // Cooked
        '.recipe-card',                    // Generic
        '[itemtype*="Recipe"]',            // Microdata Schema.org
    ];

    for (const selector of wordpressPluginSelectors) {
        const element = root.querySelector(selector);
        if (element) {
            console.log(`✅ Plugin WordPress détecté: ${selector}`);
            return true;
        }
    }

    return false;
}

/**
 * Applique des règles spécifiques selon le domaine
 * 
 * @param {HTMLElement} root - Element root de node-html-parser
 * @param {string} domain - Domaine du site
 * @returns {Object|null} - Données de recette ou null
 */
export function applySiteSpecificRules(root, domain) {
    console.log('🔍 Recherche de règles spécifiques pour:', domain);

    // Marmiton
    if (domain.includes('marmiton.org')) {
        return extractMarmiton(root);
    }

    // 750g
    if (domain.includes('750g.com')) {
        return extract750g(root);
    }

    // Cuisine AZ
    if (domain.includes('cuisineaz.com')) {
        return extractCuisineAZ(root);
    }

    // Recettes de Cuisine
    if (domain.includes('recettesdecuisine.tv')) {
        return extractRecettesDeCuisine(root);
    }

    // Cuisine Actuelle
    if (domain.includes('cuisineactuelle.fr')) {
        return extractCuisineActuelle(root);
    }

    // Papilles et Pupilles (et autres blogs WordPress avec plugins de recettes)
    if (domain.includes('papillesetpupilles.fr')) {
        return extractPapillesetpupilles(root);
    }

    // Magimix
    if (domain.includes('magimix.fr')) {
        return extractMagimix(root);
    }

    // Jow
    if (domain.includes('jow.fr')) {
        return extractJow(root);
    }

    // Cookomix
    if (domain.includes('cookomix.com')) {
        return extractCookomix(root);
    }

    // Pains Jacquet
    if (domain.includes('painsjacquet.com')) {
        return extractPainsjacquet(root);
    }

    // HelloFresh
    if (domain.includes('hellofresh')) {
        return extractHelloFresh(root);
    }

    //Yuka
    if (domain.includes('yuka.io')) {
        return extractYuka(root);
    }

    // Tupperware TN
    if (domain.includes('tupperware.tn')) {
        return extractTupperware(root);
    }

    // Au Fil du Thym
    if (domain.includes('aufilduthym.fr')) {
        return extractAuFilDuThym(root);
    }

    // Chefnini
    if (domain.includes('chefnini.com')) {
        return extractChefnini(root);
    }

    // AuxDélicesDuPalais
    if (domain.includes('auxdelicesdupalais.net')) {
        return extractAuxDelicesDuPalais(root);
    }

    // Un Déjeuner de Soleil (structure spécifique)
    if (domain.includes('undejeunerdesoleil.com')) {
        return extractUnDejeunerDeSoleil(root);
    }

    // La Cuisine de Dey (structure spécifique)
    if (domain.includes('lacuisinededey.blogspot.com')) {
        return extractLaCuisineDeDey(root);
    }

    // Les Foodies
    if (domain.includes('lesfoodies.com')) {
        return extractLesFoodies(root);
    }

    // Délices d'une novice
    if (domain.includes('delicesdunenovice.blogspot.com')) {
        return extractDelicesDuneNovice(root);
    }

    // Amandine Cooking
    if (domain.includes('amandinecooking.com')) {
        return extractAmandineCooking(root);
    }

    // // Carrefour recettes
    // if (domain.includes('carrefour.fr')) {
    //     return extractCarrefour(root);
    // }

    // Vegan pratique
    if (domain.includes('vegan-pratique.fr')) {
        return extractVeganPratique(root);
    }

    // Détecte TOUS les blogs Blogspot/Blogger
    if (domain.includes('.blogspot.')) {
        console.log('🎯 Site Blogspot détecté !');
        return extractBlogspot(root);
    }

    // ===== DÉTECTION AUTOMATIQUE WORDPRESS (PRIORITÉ 2) =====
    if (isWordPressRecipeSite(root)) {
        console.log('🎯 Site WordPress avec plugin de recettes détecté !');
        return extractWordPressRecipe(root);
    }

// 🔍 DIAGNOSTIC
    console.log('🔍 Vérification présence WordPress...');
    console.log('  - .wprm-recipe:', root.querySelectorAll('.wprm-recipe').length);
    console.log('  - .tasty-recipes:', root.querySelectorAll('.tasty-recipes').length);
    console.log('  - .recipe-card:', root.querySelectorAll('.recipe-card').length);
    console.log('  - [itemtype*="Recipe"]:', root.querySelectorAll('[itemtype*="Recipe"]').length);


    console.log('❌ Aucune règle spécifique trouvée pour ce domaine');
    return null;
}