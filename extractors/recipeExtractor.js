// extractors/recipeExtractor.js
// Module principal d'extraction de recettes depuis URL

import { parse } from 'node-html-parser';
import { extractSchemaOrg } from './schemaOrgParser';
import { extractHeuristic } from './heuristicParser';
import { applySiteSpecificRules } from './siteSpecificRules';
import { cleanRecipeData } from './cleaningUtils';
import { detectCategory } from './categoryDetector';
import { validateUrl } from './urlValidator';

/**
 * Extrait une recette depuis une URL
 * Architecture en cascade :
 * 1. Tentative Schema.org (JSON-LD + Microdata)
 * 2. Si échec : Règles spécifiques par site
 * 3. Si échec : Parsing heuristique HTML
 * 4. Nettoyage final des données
 * 5. Détection automatique de la catégorie
 * 
 * @param {string} url - URL de la recette
 * @returns {Promise<Object>} - Objet recette formaté
 */
export async function extractRecipeFromUrl(url) {
    try {
        console.log('🔍 Début extraction:', url);

        // Étape 1 : Récupérer le HTML de la page
        const html = await fetchHtml(url);
        if (!html) {
            throw new Error('Impossible de récupérer le contenu de la page');
        }

        // Charger le HTML avec node-html-parser
        const root = parse(html);
        
        // Identifier le domaine pour les règles spécifiques
        const domain = extractDomain(url);
        console.log('📍 Domaine détecté:', domain);

        let recipeData = null;

        // Étape 2 : Tentative d'extraction Schema.org (priorité 1)
        console.log('🔎 Tentative Schema.org...');
        recipeData = extractSchemaOrg(root);

        // 🔍 DIAGNOSTIC
        console.log('📊 Résultat Schema.org:', {
            titre: recipeData?.titre || 'null',
            ingredients: recipeData?.ingredients?.length || 0,
            instructions: recipeData?.instructions?.length || 0,
            temps_prep: recipeData?.temps_preparation || 'null',
            temps_cuisson: recipeData?.temps_cuisson || 'null',
        });
        
        // Vérifier que Schema.org a extrait les données ESSENTIELLES (titre, ingrédients ET instructions)
        if (recipeData && recipeData.titre && recipeData.ingredients.length > 0 && recipeData.instructions.length > 0) {
            console.log('✅ Schema.org complet !');

            // ✅ NOUVEAU : Vérifier si les ingrédients n'ont PAS de quantités
            const ingredientsWithQuantities = recipeData.ingredients.filter(ing => ing.quantite && ing.quantite.length > 0);

            if (ingredientsWithQuantities.length === 0) {
                console.log('⚠️ Ingrédients Schema.org sans quantités, tentative extracteur spécifique...');
                const siteData = applySiteSpecificRules(root, domain);
                
                if (siteData && siteData.ingredients && siteData.ingredients.length > 0) {
                    // Vérifier si les ingrédients extraits ont des quantités
                    const siteIngredientsWithQty = siteData.ingredients.filter(ing => ing.quantite && ing.quantite.length > 0);
                    
                    if (siteIngredientsWithQty.length > 0) {
                        console.log(`✅ ${siteData.ingredients.length} ingrédients avec quantités trouvés via extracteur spécifique !`);
                        recipeData.ingredients = siteData.ingredients;
                    }
                }
            }
            
            // AMÉLIORATION : Vérifier si les temps manquent et essayer de les compléter avec règles spécifiques
            if (!recipeData.temps_preparation || !recipeData.temps_cuisson) {
                console.log('🔍 Tentative de compléter les temps manquants via règles spécifiques...');
                const siteData = applySiteSpecificRules(root, domain);
                
                if (siteData) {
                    // Compléter les temps manquants
                    if (!recipeData.temps_preparation && siteData.temps_preparation) {
                        recipeData.temps_preparation = siteData.temps_preparation;
                        console.log(`✅ Temps préparation complété: ${siteData.temps_preparation} min`);
                    }
                    if (!recipeData.temps_cuisson && siteData.temps_cuisson) {
                        recipeData.temps_cuisson = siteData.temps_cuisson;
                        console.log(`✅ Temps cuisson complété: ${siteData.temps_cuisson} min`);
                    }
                }
            }
            
            // NOUVEAU : Compléter les instructions si Schema.org n'a qu'une seule instruction (souvent une astuce)
            if (recipeData.instructions.length === 1) {
                console.log('⚠️ Schema.org n\'a qu\'une seule instruction, tentative de compléter...');
                const siteData = applySiteSpecificRules(root, domain);
                
                if (siteData && siteData.instructions && siteData.instructions.length > 1) {
                    recipeData.instructions = siteData.instructions;
                    console.log(`✅ ${siteData.instructions.length} instructions complétées via règles spécifiques !`);
                }
            }
        } else if (recipeData && recipeData.titre && (recipeData.ingredients.length === 0 || recipeData.instructions.length === 0)) {
            // Schema.org incomplet - manque ingrédients et/ou instructions
            console.log('⚠️ Schema.org partiel :');
            if (recipeData.ingredients.length === 0) console.log('  - Ingrédients manquants ou sans quantités');
            if (recipeData.instructions.length === 0) console.log('  - Instructions manquantes');
            console.log('→ Tentative extraction complémentaire...');
            
            // Sauvegarder les bonnes données Schema.org (titre, temps, portions)
            const schemaData = { ...recipeData };
            
            // Tenter d'extraire les données manquantes avec les autres méthodes
            console.log('🔍 Tentative extraction complète via règles spécifiques...');
            const siteData = applySiteSpecificRules(root, domain);
            console.log('📊 Résultat règles spécifiques:', siteData ? `${siteData.ingredients?.length || 0} ing, ${siteData.instructions?.length || 0} inst` : 'null');
            
            let finalIngredients = schemaData.ingredients || [];
            let finalInstructions = schemaData.instructions || [];
            
            // Si les ingrédients manquent OU n'ont pas de quantités, prendre ceux de siteData
            const hasQuantities = finalIngredients.some(ing => ing.quantite && ing.quantite.length > 0);

            if ((finalIngredients.length < 2 || !hasQuantities) && siteData && siteData.ingredients && siteData.ingredients.length >= 2) {
                // Vérifier si siteData a des quantités
                const siteHasQuantities = siteData.ingredients.some(ing => ing.quantite && ing.quantite.length > 0);
                
                if (siteHasQuantities || finalIngredients.length < 2) {
                    console.log(`✅ ${siteData.ingredients.length} ingrédients trouvés via règles spécifiques !`);
                    finalIngredients = siteData.ingredients;
                }
            }
            
            // Si les instructions manquent, prendre celles de siteData
            if (finalInstructions.length < 2 && siteData && siteData.instructions && siteData.instructions.length >= 2) {
                console.log(`✅ ${siteData.instructions.length} instructions trouvées via règles spécifiques !`);
                finalInstructions = siteData.instructions;
            }
            
            // Si toujours des données manquantes, essayer l'heuristique
            let heuristicData = null;
            if (finalIngredients.length < 2 || finalInstructions.length < 2) {
                console.log('🔍 Tentative extraction via heuristique...');
                heuristicData = extractHeuristic(root);
                
                if (finalIngredients.length < 2 && heuristicData && heuristicData.ingredients && heuristicData.ingredients.length >= 2) {
                    console.log(`✅ ${heuristicData.ingredients.length} ingrédients trouvés via heuristique !`);
                    finalIngredients = heuristicData.ingredients;
                }
                
                if (finalInstructions.length < 2 && heuristicData && heuristicData.instructions && heuristicData.instructions.length >= 2) {
                    console.log(`✅ ${heuristicData.instructions.length} instructions trouvées via heuristique !`);
                    finalInstructions = heuristicData.instructions;
                }
            }
            
            // Vérifier qu'on a au moins les données minimales
            const hasIngredients = finalIngredients && Array.isArray(finalIngredients) && finalIngredients.length >= 2;
            const hasInstructions = finalInstructions && Array.isArray(finalInstructions) && finalInstructions.length >= 2;

            if (!hasIngredients || !hasInstructions) {
                console.log('❌ Données manquantes:', {
                    ingredients: finalIngredients?.length || 0,
                    instructions: finalInstructions?.length || 0
                });
                throw new Error('Impossible d\'extraire les données complètes de la recette');
            }
            
            // Fusionner les meilleures données
            recipeData = {
                ...schemaData,  // Garder titre, temps, portions de Schema.org
                ingredients: finalIngredients,
                instructions: finalInstructions,
            };

            // Compléter les métadonnées manquantes avec l'heuristique
            if (heuristicData) {
                if (!recipeData.temps_preparation && heuristicData.temps_preparation) {
                    recipeData.temps_preparation = heuristicData.temps_preparation;
                }
                if (!recipeData.temps_cuisson && heuristicData.temps_cuisson) {
                    recipeData.temps_cuisson = heuristicData.temps_cuisson;
                }
                if (!recipeData.nombre_portions && heuristicData.nombre_portions) {
                    recipeData.nombre_portions = heuristicData.nombre_portions;
                }
            }

            console.log(`🔄 Fusion réussie: ${finalIngredients.length} ing + ${finalInstructions.length} inst`);
        } else {
            // Schema.org totalement incomplet, tentative complète avec d'autres méthodes
            console.log('⚠️ Schema.org incomplet, tentative règles spécifiques d\'abord...');
            
            // Étape 3 : Règles spécifiques par site (priorité 2 pour sites connus)
            recipeData = applySiteSpecificRules(root, domain);
            
            if (recipeData && recipeData.titre && recipeData.ingredients.length > 0 && recipeData.instructions.length > 0) {
                console.log('✅ Règles spécifiques réussies !');
            } else {
                console.log('⚠️ Règles spécifiques incomplètes, tentative heuristique...');
                
                // Étape 4 : Parsing heuristique (priorité 3)
                recipeData = extractHeuristic(root);
                
                if (recipeData && recipeData.titre && recipeData.ingredients.length > 0 && recipeData.instructions.length > 0) {
                    console.log('✅ Extraction heuristique réussie !');
                } else {
                    console.log('❌ Extraction heuristique échouée');
                    throw new Error('Impossible d\'extraire la recette depuis cette page. Essayez l\'ajout manuel.');
                }
            }
        }

        // Étape 5 : Nettoyage et formatage final
        console.log('🧹 Nettoyage des données...');
        const cleanedRecipe = cleanRecipeData(recipeData, url);

        // Étape 6 : Détection automatique de la catégorie
        console.log('🏷️ Détection de la catégorie...');
        cleanedRecipe.categorie = detectCategory(cleanedRecipe);

        console.log('✅ Extraction terminée avec succès !');
        return cleanedRecipe;

    } catch (error) {
        console.error('❌ Erreur extraction:', error.message);
        throw error;
    }
}

/**
 * Récupère le HTML d'une URL avec retry et délai aléatoire
 * Gère automatiquement la décompression gzip/deflate
 */
async function fetchHtml(url, retries = 3) {
    // ✅ VALIDATION EN PREMIER
    try {
        validateUrl(url);
    } catch (error) {
        console.error('❌ URL refusée:', error.message);
        throw new Error(`URL non autorisée: ${error.message}`);
    }

    const TIMEOUT = 20000; // 20 secondes
    const MAX_SIZE = 5 * 1024 * 1024;
    let response;

    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT); 
        
        try {
            console.log(`🌐 Tentative ${attempt}/${retries}...`);
            
            // Délai aléatoire (Backoff)
            if (attempt > 1) {
                const isBlocked = response && [403, 429, 503].includes(response.status); 
                const baseDelay = isBlocked ? 3000 : 1000; 
                const delay = Math.random() * baseDelay * attempt + 1000; 
                
                console.log(`⏳ Attente de ${Math.round(delay)}ms (backoff)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Referer': 'https://www.google.com/', 
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (attempt < retries && [403, 429, 503].includes(response.status)) {
                    console.log(`⚠️ Status ${response.status}, nouvelle tentative...`);
                    continue; 
                }
                throw new Error(`HTTP ${response.status}`);
            }

            // ✅ NOUVEAU : Lecture avec limite de taille progressive
            let html;
            try {
                html = await response.text();
                
                // ✅ NOUVEAU : Vérifier la taille après décompression
                if (html.length > MAX_SIZE) {
                    throw new Error(`Contenu trop volumineux après décompression (${Math.round(html.length / 1024 / 1024)}MB). Maximum: 5MB`);
                }
                
                // Vérifier si c'est du HTML valide
                if (html.trim().startsWith('<') || html.includes('<!DOCTYPE')) {
                    console.log('✅ HTML reçu (déjà décompressé ou non compressé)');
                } else {
                    console.warn('⚠️ Contenu inattendu, mais on continue...');
                }
            } catch (textError) {
                console.error('❌ Erreur lecture texte:', textError.message);
                throw textError;
            }
            
            // Vérification de protection par contenu (Cloudflare) - détection plus précise
            const isCloudflareChallenge = 
                html.includes('cf-browser-verification') ||
                html.includes('Checking your browser') ||
                html.includes('Cloudflare Ray ID') ||
                (html.includes('Just a moment') && html.includes('cloudflare'));

            if (isCloudflareChallenge) {
                throw new Error('Protection détectée (Cloudflare ou Captcha)');
            }

            console.log('✅ Page chargée avec succès');
            console.log('📏 Taille HTML:', html.length, 'caractères');
            return html;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (attempt < retries) {
                console.log(`⚠️ Erreur: ${error.message}. Nouvelle tentative...`);
                continue;
            } else {
                console.error('❌ Toutes les tentatives ont échoué');
                throw error;
            }
        }
    }
}

/**
 * Extrait le domaine d'une URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return '';
    }
}

/**
 * Valide qu'une recette a les champs minimum requis
 */
export function isValidRecipe(recipe) {
    return (
        recipe &&
        recipe.titre &&
        recipe.titre.length > 0 &&
        recipe.ingredients &&
        recipe.ingredients.length > 0 &&
        recipe.instructions &&
        recipe.instructions.length > 0
    );
}