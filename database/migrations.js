// database/migrations.js
// Gestion des migrations de base de données

/**
 * ✅ NOUVEAU : Valide les noms de table autorisés
 */
function validateTableName(tableName) {
    const allowedTables = ['recettes', 'shopping_list'];
    
    if (!allowedTables.includes(tableName)) {
        throw new Error(`Nom de table non autorisé: ${tableName}`);
    }
    
    return tableName;
}

/**
 * ✅ SÉCURISÉ : Vérifie si une colonne existe dans une table
 */
async function columnExists(db, tableName, columnName) {
    try {
        // Valider le nom de table
        validateTableName(tableName);
        
        const allColumns = await db.getAllAsync(
            `PRAGMA table_info(${tableName})`  // Maintenant sécurisé car validé
        );
        
        return allColumns.some(col => col.name === columnName);
    } catch (error) {
        console.error('Erreur columnExists:', error);
        return false;
    }
}

/**
 * ✅ BON : Vérifie si une table existe (déjà sécurisé avec requête préparée)
 */
async function tableExists(db, tableName) {
    try {
        const result = await db.getFirstAsync(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName]
        );
        return result !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Migration v1 -> v2 : Ajout de la colonne categorie
 */
async function migrateToV2(db) {
    console.log('🔄 Migration v1 -> v2: Ajout colonne categorie...');
    
    try {
        // Vérifier si la colonne existe déjà
        const exists = await columnExists(db, 'recettes', 'categorie');
        
        if (exists) {
            console.log('✅ Colonne categorie existe déjà');
            return true;
        }
        
        // Ajouter la colonne categorie
        await db.execAsync(`
            ALTER TABLE recettes ADD COLUMN categorie TEXT DEFAULT 'autre';
        `);
        
        console.log('✅ Colonne categorie ajoutée avec succès');
        
        // Créer l'index pour la catégorie
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_recettes_categorie ON recettes(categorie);
        `);
        
        console.log('✅ Index créé pour categorie');
        
        // Optionnel : Tenter de détecter les catégories pour les recettes existantes
        console.log('🏷️ Détection des catégories pour les recettes existantes...');
        const recettes = await db.getAllAsync('SELECT id, titre, tags FROM recettes');
        
        for (const recette of recettes) {
            const categorie = detectCategoryFromTitle(recette.titre, recette.tags);
            await db.runAsync(
                'UPDATE recettes SET categorie = ? WHERE id = ?',
                [categorie, recette.id]
            );
        }
        
        console.log(`✅ ${recettes.length} recettes mises à jour avec leurs catégories`);
        
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la migration v2:', error);
        throw error;
    }
}

/**
 * Migration v2 -> v3 : Création de la table shopping_list
 */
async function migrateToV3(db) {
    console.log('🔄 Migration v2 -> v3: Création table shopping_list...');
    
    try {
        // Vérifier si la table existe déjà
        const exists = await tableExists(db, 'shopping_list');
        
        if (exists) {
            console.log('✅ Table shopping_list existe déjà');
            return true;
        }
        
        // Créer la table shopping_list
        await db.execAsync(`
            CREATE TABLE shopping_list (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ingredient TEXT NOT NULL,
                quantite REAL,
                unite TEXT,
                checked INTEGER DEFAULT 0,
                date_ajout TEXT DEFAULT CURRENT_TIMESTAMP,
                recette_id INTEGER,
                recette_titre TEXT,
                FOREIGN KEY (recette_id) REFERENCES recettes(id) ON DELETE CASCADE
            );
        `);
        
        console.log('✅ Table shopping_list créée avec succès');
        
        // Créer les index
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_shopping_checked ON shopping_list(checked);
            CREATE INDEX IF NOT EXISTS idx_shopping_recette ON shopping_list(recette_id);
        `);
        
        console.log('✅ Index créés pour shopping_list');
        
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la migration v3:', error);
        throw error;
    }
}

/**
 * ✅ SÉCURISÉ : Détection basique de catégorie depuis le titre
 */
function detectCategoryFromTitle(titre, tagsJson) {
    const lowerTitre = titre.toLowerCase();
    
    // ✅ NOUVEAU : Protection JSON.parse
    let tags = [];
    try {
        tags = tagsJson ? JSON.parse(tagsJson) : [];
    } catch (error) {
        console.warn('⚠️ Erreur parsing tags JSON:', error);
        tags = [];
    }
    
    const lowerTags = tags.map(t => String(t).toLowerCase()).join(' ');
    const fullText = `${lowerTitre} ${lowerTags}`;
    
    // Desserts
    if (fullText.match(/dessert|gâteau|tarte|cake|brownie|cookie|mousse|crème|fondant|chocolat/)) {
        return 'dessert';
    }
    
    // Entrées
    if (fullText.match(/entrée|salade|soupe|velouté|quiche|tarte salée/)) {
        return 'entrée';
    }
    
    // Snacks
    if (fullText.match(/snack|goûter|apéritif|apéro|dip|houmous|guacamole/)) {
        return 'snack';
    }
    
    // Boissons
    if (fullText.match(/boisson|jus|smoothie|cocktail|café/)) {
        return 'boisson';
    }
    
    // Plats
    if (fullText.match(/plat|pizza|pâtes|riz|poulet|viande|poisson|curry|gratin/)) {
        return 'plat';
    }
    
    return 'autre';
}

/**
 * Migration v4 : Ajout des notes personnelles
 */
async function migrateToV4(db) {
    console.log('🔄 Migration v4 : Ajout des notes personnelles...');
    
    try {
        // Vérifier si la colonne existe déjà
        const exists = await columnExists(db, 'recettes', 'notes_personnelles');
        
        if (exists) {
            console.log('✅ Colonne notes_personnelles existe déjà');
            return true;
        }
        
        // Ajouter la colonne notes_personnelles
        await db.execAsync(`
            ALTER TABLE recettes 
            ADD COLUMN notes_personnelles TEXT DEFAULT '';
        `);
        
        console.log('✅ Migration v4 terminée - Colonne notes_personnelles ajoutée');
        return true;
    } catch (error) {
        console.error('❌ Erreur migration v4:', error);
        throw error;
    }
}

/**
 * Migration v5 : Ajout de la colonne custom_timers
 */
async function migrateToV5(db) {
    console.log('🔄 Migration v5 : Ajout des timers personnalisés...');
    
    try {
        // Vérifier si la colonne existe déjà
        const exists = await columnExists(db, 'recettes', 'custom_timers');
        
        if (exists) {
            console.log('✅ Colonne custom_timers existe déjà');
            return true;
        }
        
        // Ajouter la colonne custom_timers
        await db.execAsync(`
            ALTER TABLE recettes 
            ADD COLUMN custom_timers TEXT DEFAULT '[]';
        `);
        
        console.log('✅ Migration v5 terminée - Colonne custom_timers ajoutée');
        return true;
    } catch (error) {
        console.error('❌ Erreur migration v5:', error);
        throw error;
    }
}

/**
 * Exécute toutes les migrations nécessaires
 */
export async function runMigrations(db) {
    console.log('🔄 Vérification des migrations...');
    
    try {
        // Migration v2 : Ajout de la colonne categorie
        await migrateToV2(db);
        
        // Migration v3 : Création de la table shopping_list
        await migrateToV3(db);

        // Migration v4 : Ajout des notes personnelles
        await migrateToV4(db);

        // Migration v5 : Ajout des timers personnalisés
        await migrateToV5(db);
        
        console.log('✅ Toutes les migrations sont à jour');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors des migrations:', error);
        throw error;
    }
}