// database/db.js
// Gestionnaire de base de données SQLite

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLE_RECETTES, CREATE_INDEXES } from './schema';
import { runMigrations } from './migrations';

const DB_NAME = 'recettes.db';

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    /**
     * Initialise la base de données et crée les tables si nécessaire
     */
    async init() {
        try {
            this.db = await SQLite.openDatabaseAsync(DB_NAME);
            
            // Créer la table recettes (si elle n'existe pas)
            await this.db.execAsync(CREATE_TABLE_RECETTES);
            
            // Exécuter les migrations (ajoute les colonnes manquantes)
            await runMigrations(this.db);
            
            // Créer les index
            await this.db.execAsync(CREATE_INDEXES);
            
            console.log('Base de données initialisée avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la base de données:', error);
            throw error;
        }
    }

    /**
     * ✅ NOUVEAU : Valide et sécurise le paramètre ORDER BY
     * @param {string} orderBy - Paramètre de tri
     * @returns {string} - Paramètre sécurisé ou valeur par défaut
     */
    validateOrderBy(orderBy) {
        // Whitelist des colonnes et directions autorisées
        const allowedColumns = [
            'date_creation',
            'date_modification',
            'titre',
            'temps_preparation',
            'temps_cuisson',
            'nombre_portions',
            'est_favori',
            'categorie'
        ];
        
        const allowedDirections = ['ASC', 'DESC'];
        
        // Parser la chaîne (ex: "titre DESC")
        const parts = orderBy.trim().split(/\s+/);
        const column = parts[0];
        const direction = parts[1] ? parts[1].toUpperCase() : 'DESC';
        
        // Vérifier que la colonne est autorisée
        if (!allowedColumns.includes(column)) {
            console.warn(`⚠️ Colonne non autorisée: ${column}. Utilisation de date_creation par défaut.`);
            return 'date_creation DESC';
        }
        
        // Vérifier que la direction est autorisée
        if (!allowedDirections.includes(direction)) {
            console.warn(`⚠️ Direction non autorisée: ${direction}. Utilisation de DESC par défaut.`);
            return `${column} DESC`;
        }
        
        return `${column} ${direction}`;
    }

    /**
     * ✅ SÉCURISÉ : Parse JSON avec gestion d'erreur
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('⚠️ Erreur parsing JSON:', error);
            return defaultValue;
        }
    }

    /**
     * Compte le nombre total de recettes (pour la limite freemium)
     */
    async countRecettes() {
        try {
            const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM recettes');
            return result.count;
        } catch (error) {
            console.error('Erreur lors du comptage des recettes:', error);
            return 0;
        }
    }

    /**
     * ✅ SÉCURISÉ : Récupère toutes les recettes
     * @param {string} orderBy - Champ de tri (date_creation, titre, etc.)
     * @param {boolean} onlyFavorites - Ne récupérer que les favoris
     */
    async getAllRecettes(orderBy = 'date_creation DESC', onlyFavorites = false) {
        try {
            // ✅ Valider et sécuriser orderBy
            const safeOrderBy = this.validateOrderBy(orderBy);
            
            let query = 'SELECT * FROM recettes';
            
            if (onlyFavorites) {
                query += ' WHERE est_favori = 1';
            }
            
            query += ` ORDER BY ${safeOrderBy}`;
            
            const recettes = await this.db.getAllAsync(query);
            
            // Parser les champs JSON avec protection
            return recettes.map(recette => ({
                ...recette,
                ingredients: this.safeJsonParse(recette.ingredients, []),
                instructions: this.safeJsonParse(recette.instructions, []),
                tags: this.safeJsonParse(recette.tags, []),
                custom_timers: this.safeJsonParse(recette.custom_timers, [])
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des recettes:', error);
            return [];
        }
    }

    /**
     * Compte le nombre de recettes ajoutées dans les 7 derniers jours
     * @returns {Promise<number>}
     */
    async getRecentRecettesCount() {
        try {
            // Calculer la date d'il y a 7 jours en millisecondes
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            const result = await this.db.getFirstAsync(
                'SELECT COUNT(*) as count FROM recettes WHERE date_creation >= ?',
                [sevenDaysAgo]
            );
            
            return result?.count || 0;
        } catch (error) {
            console.error('Erreur comptage recettes récentes:', error);
            return 0;
        }
    }

    /**
     * Récupère les recettes groupées par catégorie
     */
    async getRecettesGroupedByCategory(onlyFavorites = false) {
        try {
            const recettes = await this.getAllRecettes('titre ASC', onlyFavorites);
            
            // Grouper par catégorie
            const grouped = {
                'entrée': [],
                'plat': [],
                'dessert': [],
                'snack': [],
                'boisson': [],
                'autre': []
            };
            
            recettes.forEach(recette => {
                const cat = recette.categorie || 'autre';
                if (grouped[cat]) {
                    grouped[cat].push(recette);
                } else {
                    grouped['autre'].push(recette);
                }
            });
            
            return grouped;
        } catch (error) {
            console.error('Erreur lors du groupement des recettes:', error);
            return {};
        }
    }

    /**
     * Récupère une recette par son ID
     */
    async getRecetteById(id) {
        try {
            const recette = await this.db.getFirstAsync(
                'SELECT * FROM recettes WHERE id = ?',
                [id]
            );
            
            if (!recette) return null;
            
            return {
                ...recette,
                ingredients: this.safeJsonParse(recette.ingredients, []),
                instructions: this.safeJsonParse(recette.instructions, []),
                tags: this.safeJsonParse(recette.tags, []),
                custom_timers: this.safeJsonParse(recette.custom_timers, [])
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de la recette:', error);
            return null;
        }
    }

    /**
     * Ajoute une nouvelle recette
     * @returns {number} ID de la recette créée
     */
    async addRecette(recetteData) {
        try {
            const now = new Date().toISOString();
            
            const result = await this.db.runAsync(
                `INSERT INTO recettes (
                titre, ingredients, instructions, categorie, url_source,
                temps_preparation, temps_cuisson, nombre_portions, nombre_portions_original,
                tags, date_creation, date_modification, est_favori, notes_personnelles, custom_timers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    recetteData.titre,
                    JSON.stringify(recetteData.ingredients),
                    JSON.stringify(recetteData.instructions),
                    recetteData.categorie || 'autre',
                    recetteData.url_source || null,
                    recetteData.temps_preparation || null,
                    recetteData.temps_cuisson || null,
                    recetteData.nombre_portions || 4,
                    recetteData.nombre_portions_original || recetteData.nombre_portions || 4,
                    JSON.stringify(recetteData.tags || []),
                    now,
                    now,
                    recetteData.est_favori || 0,
                    recetteData.notes_personnelles || '',
                    JSON.stringify(recetteData.custom_timers || []),
                ]
            );
            
            console.log('Recette ajoutée avec succès, ID:', result.lastInsertRowId);
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la recette:', error);
            throw error;
        }
    }

    /**
     * Met à jour une recette existante
     */
    async updateRecette(id, recetteData) {
        try {
            const now = new Date().toISOString();
            
            await this.db.runAsync(
                `UPDATE recettes SET
                titre = ?,
                ingredients = ?,
                instructions = ?,
                categorie = ?,
                url_source = ?,
                temps_preparation = ?,
                temps_cuisson = ?,
                nombre_portions = ?,
                tags = ?,
                date_modification = ?,
                est_favori = ?,
                notes_personnelles = ?,
                custom_timers = ?
                WHERE id = ?`,
                [
                    recetteData.titre,
                    JSON.stringify(recetteData.ingredients),
                    JSON.stringify(recetteData.instructions),
                    recetteData.categorie || 'autre',
                    recetteData.url_source || null,
                    recetteData.temps_preparation || null,
                    recetteData.temps_cuisson || null,
                    recetteData.nombre_portions || 4,
                    JSON.stringify(recetteData.tags || []),
                    now,
                    recetteData.est_favori || 0,
                    recetteData.notes_personnelles || '',
                    JSON.stringify(recetteData.custom_timers || []),
                    id
                ]
            );
            
            console.log('Recette mise à jour avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la recette:', error);
            throw error;
        }
    }

    /**
     * Supprime une recette
     */
    async deleteRecette(id) {
        try {
            await this.db.runAsync('DELETE FROM recettes WHERE id = ?', [id]);
            console.log('Recette supprimée avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de la recette:', error);
            throw error;
        }
    }

    /**
     * Toggle le statut favori d'une recette
     */
    async toggleFavori(id) {
        try {
            const recette = await this.getRecetteById(id);
            if (!recette) return false;
            
            const nouveauStatut = recette.est_favori === 1 ? 0 : 1;
            
            await this.db.runAsync(
                'UPDATE recettes SET est_favori = ?, date_modification = ? WHERE id = ?',
                [nouveauStatut, new Date().toISOString(), id]
            );
            
            return true;
        } catch (error) {
            console.error('Erreur lors du toggle favori:', error);
            return false;
        }
    }

    /**
     * Recherche des recettes par titre, ingrédients ou tags
     */
    async searchRecettes(searchTerm) {
        try {
            // Normaliser le terme de recherche (retirer les accents)
            const normalizedSearch = this.removeAccents(searchTerm.toLowerCase());
            
            // Récupérer toutes les recettes
            const allRecettes = await this.getAllRecettes('date_creation DESC', false);
            
            // Filtrer côté JavaScript pour ignorer les accents
            const filtered = allRecettes.filter(recette => {
                const normalizedTitle = this.removeAccents(recette.titre.toLowerCase());
                const normalizedIngredients = this.removeAccents(
                    recette.ingredients.map(ing => ing.ingredient).join(' ').toLowerCase()
                );
                const normalizedTags = this.removeAccents(
                    recette.tags ? recette.tags.join(' ').toLowerCase() : ''
                );
                
                return normalizedTitle.includes(normalizedSearch) || 
                    normalizedIngredients.includes(normalizedSearch) ||
                    normalizedTags.includes(normalizedSearch);
            });
            
            return filtered;
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            return [];
        }
    }
    
    /**
     * Retire les accents d'une chaîne de caractères
     */
    removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // ==================== LISTE DE COURSES ====================

    /**
     * Ajoute les ingrédients d'une recette à la liste de courses
     * Avec agrégation intelligente des quantités similaires
     */
    async addRecetteToShoppingList(recetteId) {
        try {
            const recette = await this.getRecetteById(recetteId);
            if (!recette) {
                throw new Error('Recette introuvable');
            }

            console.log(`🛒 Ajout de ${recette.ingredients.length} ingrédients à la liste...`);

            for (const ingredient of recette.ingredients) {
                // Chercher si l'ingrédient existe déjà dans la liste
                const existing = await this.db.getFirstAsync(
                    `SELECT * FROM shopping_list 
                     WHERE LOWER(ingredient) = LOWER(?) 
                     AND LOWER(unite) = LOWER(?)
                     AND checked = 0`,
                    [ingredient.ingredient, ingredient.unite || '']
                );

                if (existing && existing.quantite && ingredient.quantite) {
                    // Agréger les quantités
                    const newQuantite = parseFloat(existing.quantite) + parseFloat(ingredient.quantite);
                    
                    await this.db.runAsync(
                        `UPDATE shopping_list 
                         SET quantite = ?, 
                             recette_titre = recette_titre || ', ' || ?
                         WHERE id = ?`,
                        [newQuantite, recette.titre, existing.id]
                    );
                    
                    console.log(`✅ Agrégé: ${ingredient.ingredient} ${existing.quantite} + ${ingredient.quantite} = ${newQuantite} ${ingredient.unite}`);
                } else {
                    // Ajouter un nouvel élément
                    await this.db.runAsync(
                        `INSERT INTO shopping_list 
                         (ingredient, quantite, unite, recette_id, recette_titre, date_ajout)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            ingredient.ingredient,
                            ingredient.quantite || null,
                            ingredient.unite || '',
                            recetteId,
                            recette.titre,
                            new Date().toISOString()
                        ]
                    );
                    
                    console.log(`➕ Ajouté: ${ingredient.ingredient}`);
                }
            }

            console.log('✅ Recette ajoutée à la liste de courses');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'ajout à la liste de courses:', error);
            throw error;
        }
    }

    /**
     * Ajoute des ingrédients spécifiques à la liste de courses
     * (utile pour les quantités ajustées)
     */
    async addIngredientsToShoppingList(ingredients, recetteId, recetteTitre) {
        try {
            console.log(`🛒 Ajout de ${ingredients.length} ingrédients ajustés à la liste...`);

            for (const ingredient of ingredients) {
                // Chercher si l'ingrédient existe déjà dans la liste
                const existing = await this.db.getFirstAsync(
                    `SELECT * FROM shopping_list 
                     WHERE LOWER(ingredient) = LOWER(?) 
                     AND LOWER(unite) = LOWER(?)
                     AND checked = 0`,
                    [ingredient.ingredient, ingredient.unite || '']
                );

                if (existing && existing.quantite && ingredient.quantite) {
                    // Agréger les quantités
                    const newQuantite = parseFloat(existing.quantite) + parseFloat(ingredient.quantite);
                    
                    await this.db.runAsync(
                        `UPDATE shopping_list 
                         SET quantite = ?, 
                             recette_titre = recette_titre || ', ' || ?
                         WHERE id = ?`,
                        [newQuantite, recetteTitre, existing.id]
                    );
                    
                    console.log(`✅ Agrégé: ${ingredient.ingredient} ${existing.quantite} + ${ingredient.quantite} = ${newQuantite} ${ingredient.unite}`);
                } else {
                    // Ajouter un nouvel élément
                    await this.db.runAsync(
                        `INSERT INTO shopping_list 
                         (ingredient, quantite, unite, recette_id, recette_titre, date_ajout)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            ingredient.ingredient,
                            ingredient.quantite || null,
                            ingredient.unite || '',
                            recetteId,
                            recetteTitre,
                            new Date().toISOString()
                        ]
                    );
                    
                    console.log(`➕ Ajouté: ${ingredient.ingredient}`);
                }
            }

            console.log('✅ Ingrédients ajustés ajoutés à la liste de courses');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'ajout à la liste de courses:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les éléments de la liste de courses
     */
    async getShoppingList() {
        try {
            const items = await this.db.getAllAsync(
                `SELECT * FROM shopping_list ORDER BY checked ASC, date_ajout DESC`
            );
            return items;
        } catch (error) {
            console.error('Erreur lors de la récupération de la liste:', error);
            return [];
        }
    }

    /**
     * Toggle le statut "coché" d'un élément de la liste
     */
    async toggleShoppingItem(id) {
        try {
            const item = await this.db.getFirstAsync(
                'SELECT checked FROM shopping_list WHERE id = ?',
                [id]
            );
            
            if (!item) return false;
            
            const newStatus = item.checked === 1 ? 0 : 1;
            
            await this.db.runAsync(
                'UPDATE shopping_list SET checked = ? WHERE id = ?',
                [newStatus, id]
            );
            
            return true;
        } catch (error) {
            console.error('Erreur lors du toggle:', error);
            return false;
        }
    }

    /**
     * Supprime un élément de la liste de courses
     */
    async deleteShoppingItem(id) {
        try {
            await this.db.runAsync('DELETE FROM shopping_list WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            return false;
        }
    }

    /**
     * Supprime tous les éléments cochés de la liste
     */
    async clearCheckedItems() {
        try {
            await this.db.runAsync('DELETE FROM shopping_list WHERE checked = 1');
            console.log('✅ Éléments cochés supprimés');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression des éléments cochés:', error);
            return false;
        }
    }

    /**
     * Vide complètement la liste de courses
     */
    async clearShoppingList() {
        try {
            await this.db.runAsync('DELETE FROM shopping_list');
            console.log('✅ Liste de courses vidée');
            return true;
        } catch (error) {
            console.error('Erreur lors du vidage de la liste:', error);
            return false;
        }
    }

    /**
     * Compte le nombre d'éléments dans la liste de courses
     */
    async countShoppingItems() {
        try {
            const result = await this.db.getFirstAsync(
                'SELECT COUNT(*) as count FROM shopping_list WHERE checked = 0'
            );
            return result.count;
        } catch (error) {
            console.error('Erreur lors du comptage:', error);
            return 0;
        }
    }

    /**
     * Ajoute un article manuel à la liste de courses
     * @param {string} ingredient - Nom de l'ingrédient
     * @param {string} quantite - Quantité (optionnel)
     * @param {string} unite - Unité (optionnel)
     */
    async addManualShoppingItem(ingredient, quantite = '', unite = '') {
        try {
            await this.db.runAsync(
                `INSERT INTO shopping_list (ingredient, quantite, unite, recette_id, recette_titre, checked)
                VALUES (?, ?, ?, NULL, NULL, 0)`,
                [ingredient, quantite, unite]
            );
            console.log('✅ Article manuel ajouté à la liste');
        } catch (error) {
            console.error('Erreur ajout article manuel:', error);
            throw error;
        }
    }

    /**
     * ✅ SÉCURISÉ : Supprime plusieurs recettes
     */
    async deleteRecettes(ids) {
        try {
            // Valider que tous les IDs sont des nombres
            if (!Array.isArray(ids) || ids.length === 0) {
                throw new Error('IDs invalides');
            }
            
            const validIds = ids.filter(id => Number.isInteger(Number(id)));
            if (validIds.length !== ids.length) {
                console.warn('⚠️ Certains IDs invalides ont été ignorés');
            }
            
            if (validIds.length === 0) {
                throw new Error('Aucun ID valide');
            }
            
            console.log(`🗑️ Suppression de ${validIds.length} recettes...`);
            
            const placeholders = validIds.map(() => '?').join(',');
            await this.db.runAsync(
                `DELETE FROM recettes WHERE id IN (${placeholders})`,
                validIds
            );
            
            console.log('✅ Recettes supprimées avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression multiple:', error);
            throw error;
        }
    }

    /**
     * Supprime TOUTES les recettes (pour la réinitialisation)
     */
    async deleteAllRecettes() {
        try {
            console.log('🗑️ Suppression de TOUTES les recettes...');
            
            await this.db.runAsync('DELETE FROM recettes');
            await this.db.runAsync('DELETE FROM shopping_list');
            
            console.log('✅ Toutes les recettes supprimées');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression totale:', error);
            throw error;
        }
    }

    // ==================== PARTAGE DE RECETTES ====================

    /**
     * Exporte une seule recette au format JSON
     */
    async exportRecette(recetteId) {
        try {
            console.log('📤 Export recette ID:', recetteId);
            
            const recette = await this.getRecetteById(recetteId);
            if (!recette) {
                throw new Error('Recette introuvable');
            }
            
            // Créer l'objet d'export
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                appName: 'Cuisin\'essentiel',
                type: 'single_recipe',
                recette: recette
            };
            
            console.log(`✅ Recette "${recette.titre}" exportée`);
            return exportData;
        } catch (error) {
            console.error('❌ Erreur export recette:', error);
            throw error;
        }
    }

    /**
     * Exporte plusieurs recettes au format JSON
     */
    async exportRecettes(recetteIds) {
        try {
            console.log('📤 Export de', recetteIds.length, 'recettes...');
            
            const recettes = [];
            for (const id of recetteIds) {
                const recette = await this.getRecetteById(id);
                if (recette) {
                    recettes.push(recette);
                }
            }
            
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                appName: 'Cuisin\'essentiel',
                type: 'multiple_recipes',
                recettesCount: recettes.length,
                recettes: recettes
            };
            
            console.log(`✅ ${recettes.length} recettes exportées`);
            return exportData;
        } catch (error) {
            console.error('❌ Erreur export recettes:', error);
            throw error;
        }
    }

    /**
     * Importe une ou plusieurs recettes depuis un JSON de partage
     */
    async importSharedRecettes(importData) {
        try {
            console.log('📥 Import recettes partagées...');
            
            let recettesToImport = [];
            
            // Détecter le format
            if (importData.type === 'single_recipe' && importData.recette) {
                recettesToImport = [importData.recette];
            } else if (importData.type === 'multiple_recipes' && importData.recettes) {
                recettesToImport = importData.recettes;
            } else if (importData.recettes) {
                // Format backup complet
                recettesToImport = importData.recettes;
            } else {
                throw new Error('Format de fichier invalide');
            }
            
            let imported = 0;
            let skipped = 0;
            
            for (const recette of recettesToImport) {
                try {
                    // Vérifier si la recette existe déjà
                    const existing = await this.db.getFirstAsync(
                        'SELECT id FROM recettes WHERE titre = ?',
                        [recette.titre]
                    );
                    
                    if (existing) {
                        console.log(`⏭️ "${recette.titre}" existe déjà`);
                        skipped++;
                        continue;
                    }
                    
                    // Ajouter la recette
                    await this.addRecette({
                        titre: recette.titre,
                        ingredients: recette.ingredients,
                        instructions: recette.instructions,
                        categorie: recette.categorie || 'autre',
                        url_source: recette.url_source || null,
                        temps_preparation: recette.temps_preparation || null,
                        temps_cuisson: recette.temps_cuisson || null,
                        nombre_portions: recette.nombre_portions || 4,
                        nombre_portions_original: recette.nombre_portions_original || recette.nombre_portions || 4,
                        tags: recette.tags || [],
                        est_favori: 0, // Ne pas importer le statut favori
                        notes_personnelles: recette.notes_personnelles || ''
                    });
                    
                    imported++;
                } catch (error) {
                    console.error(`❌ Erreur import "${recette.titre}":`, error);
                }
            }
            
            return { imported, skipped, total: recettesToImport.length };
        } catch (error) {
            console.error('❌ Erreur import:', error);
            throw error;
        }
    }

    // ==================== EXPORT / IMPORT ====================

    /**
     * Exporte toutes les recettes vers un objet JSON
     */
    async exportAllRecettes() {
        try {
            console.log('📤 Export des recettes...');
            
            // Récupérer toutes les recettes
            const recettes = await this.getAllRecettes('date_creation DESC', false);
            
            // Récupérer la liste de courses
            const shoppingList = await this.getShoppingList();
            
            // Créer l'objet d'export avec métadonnées
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                appName: 'Cuisin\'essentiel',
                recettesCount: recettes.length,
                recettes: recettes,
                shoppingList: shoppingList
            };
            
            console.log(`✅ ${recettes.length} recettes exportées`);
            return exportData;
        } catch (error) {
            console.error('❌ Erreur export:', error);
            throw error;
        }
    }

    /**
     * Importe des recettes depuis un objet JSON
     * @param {object} importData - Données importées
     * @param {boolean} replaceAll - Si true, remplace toutes les recettes existantes
     */
    async importRecettes(importData, replaceAll = false) {
        try {
            console.log('📥 Import des recettes...');
            
            // Vérifier la validité des données
            if (!importData || !importData.recettes || !Array.isArray(importData.recettes)) {
                throw new Error('Format de fichier invalide');
            }
            
            let imported = 0;
            let skipped = 0;
            let errors = 0;
            
            // Si replaceAll, vider la base de données
            if (replaceAll) {
                console.log('⚠️ Suppression de toutes les recettes existantes...');
                await this.db.runAsync('DELETE FROM recettes');
                await this.db.runAsync('DELETE FROM shopping_list');
            }
            
            // Importer chaque recette
            for (const recette of importData.recettes) {
                try {
                    // Vérifier si la recette existe déjà (par titre)
                    const existing = await this.db.getFirstAsync(
                        'SELECT id FROM recettes WHERE titre = ?',
                        [recette.titre]
                    );
                    
                    if (existing && !replaceAll) {
                        console.log(`⏭️ Recette "${recette.titre}" existe déjà, ignorée`);
                        skipped++;
                        continue;
                    }
                    
                    // Préparer les données de la recette
                    const recetteToImport = {
                        titre: recette.titre,
                        ingredients: recette.ingredients,
                        instructions: recette.instructions,
                        categorie: recette.categorie || 'autre',
                        url_source: recette.url_source || null,
                        temps_preparation: recette.temps_preparation || null,
                        temps_cuisson: recette.temps_cuisson || null,
                        nombre_portions: recette.nombre_portions || 4,
                        nombre_portions_original: recette.nombre_portions_original || recette.nombre_portions || 4,
                        tags: recette.tags || [],
                        est_favori: recette.est_favori || 0,
                        notes_personnelles: recette.notes_personnelles || ''
                    };
                    
                    // Ajouter la recette
                    await this.addRecette(recetteToImport);
                    imported++;
                    
                } catch (error) {
                    console.error(`❌ Erreur import "${recette.titre}":`, error);
                    errors++;
                }
            }
            
            console.log(`✅ Import terminé: ${imported} importées, ${skipped} ignorées, ${errors} erreurs`);
            
            return {
                success: true,
                imported,
                skipped,
                errors,
                total: importData.recettes.length
            };
        } catch (error) {
            console.error('❌ Erreur import:', error);
            throw error;
        }
    }
}

// Export singleton
export default new DatabaseManager();