// database/schema.js
// Schéma de la base de données SQLite pour les recettes

export const SCHEMA_VERSION = 1;

/**
 * Schéma de la table Recettes
 * 
 * Structure:
 * - id: Identifiant unique (INTEGER PRIMARY KEY AUTOINCREMENT)
 * - titre: Titre de la recette (TEXT NOT NULL)
 * - ingredients: Liste des ingrédients au format JSON (TEXT NOT NULL)
 * - instructions: Étapes de préparation au format JSON (TEXT NOT NULL)
 * - categorie: Catégorie du plat (TEXT) - entrée, plat, dessert, snack, boisson, autre
 * - url_source: URL d'origine de la recette (TEXT)
 * - temps_preparation: Temps de préparation en minutes (INTEGER)
 * - temps_cuisson: Temps de cuisson en minutes (INTEGER)
 * - nombre_portions: Nombre de portions (INTEGER)
 * - nombre_portions_original: Nombre de portions d'origine pour le scaling (INTEGER)
 * - tags: Tags/catégories au format JSON (TEXT)
 * - date_creation: Date de création (TEXT ISO 8601)
 * - date_modification: Date de dernière modification (TEXT ISO 8601)
 * - est_favori: Marqueur de favori (INTEGER 0/1)
 */

export const CREATE_TABLE_RECETTES = `
    CREATE TABLE IF NOT EXISTS recettes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titre TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        categorie TEXT DEFAULT 'autre',
        url_source TEXT,
        temps_preparation INTEGER,
        temps_cuisson INTEGER,
        nombre_portions INTEGER DEFAULT 4,
        nombre_portions_original INTEGER DEFAULT 4,
        tags TEXT DEFAULT '[]',
        date_creation TEXT NOT NULL,
        date_modification TEXT NOT NULL,
        est_favori INTEGER DEFAULT 0,
        CHECK(est_favori IN (0, 1))
    );
    `;

    /**
     * Index pour optimiser les recherches
     */
    export const CREATE_INDEXES = `
    CREATE INDEX IF NOT EXISTS idx_recettes_date_creation ON recettes(date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_recettes_favori ON recettes(est_favori);
    CREATE INDEX IF NOT EXISTS idx_recettes_titre ON recettes(titre);
    `;

    /**
     * Structure JSON attendue pour les ingrédients:
     * [
     *   {
     *     "quantite": "250",
     *     "unite": "g",
     *     "ingredient": "farine"
     *   },
     *   {
     *     "quantite": "3",
     *     "unite": "",
     *     "ingredient": "œufs"
     *   }
     * ]
     */

    /**
     * Structure JSON attendue pour les instructions:
     * [
     *   "Préchauffer le four à 180°C.",
     *   "Mélanger la farine et les œufs.",
     *   "Enfourner pendant 30 minutes."
     * ]
     */

    /**
     * Structure JSON attendue pour les tags:
     * ["dessert", "facile", "végétarien"]
     */

    /**
     * Catégories disponibles:
     * - "entrée": Entrées, hors-d'œuvre, salades
     * - "plat": Plats principaux
     * - "dessert": Desserts, pâtisseries
     * - "snack": Goûters, collations, apéritifs
     * - "boisson": Boissons, cocktails
     * - "autre": Non classifié
     */

    export const SAMPLE_DATA = {
    titre: "Exemple de recette",
    ingredients: JSON.stringify([
        { quantite: "250", unite: "g", ingredient: "farine" },
        { quantite: "3", unite: "", ingredient: "œufs" },
        { quantite: "100", unite: "ml", ingredient: "lait" }
    ]),
    instructions: JSON.stringify([
        "Préchauffer le four à 180°C.",
        "Mélanger tous les ingrédients dans un saladier.",
        "Verser dans un moule beurré.",
        "Enfourner pendant 30 minutes."
    ]),
    categorie: "dessert",
    url_source: null,
    temps_preparation: 15,
    temps_cuisson: 30,
    nombre_portions: 4,
    nombre_portions_original: 4,
    tags: JSON.stringify(["dessert", "facile"]),
    date_creation: new Date().toISOString(),
    date_modification: new Date().toISOString(),
    est_favori: 0
};