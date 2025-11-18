// utils/exportImportManager.js
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import db from '../database/db';
import premiumManager from './premiumManager';

const APP_VERSION = '1.0.0';

/**
 * Exporter toutes les recettes
 */
export const exportAllRecettes = async () => {
    try {
        // Vérifier premium pour l'export
        const check = premiumManager.canAccessFeature('export');
        if (!check.canAccess) {
            return {
                success: false,
                error: check.reason,
                isPremiumRequired: true
            };
        }

        const recettes = await db.getAllRecettes();
        
        if (recettes.length === 0) {
            return {
                success: false,
                error: 'Vous n\'avez aucune recette à exporter.'
            };
        }

        const data = {
            version: APP_VERSION,
            exportDate: new Date().toISOString(),
            appName: 'Cuisin\'essentiel',
            recettesCount: recettes.length,
            recettes: recettes,
        };

        const jsonData = JSON.stringify(data, null, 2);
        const fileName = `cuisinEssentiel_backup_${new Date().toISOString().split('T')[0]}.cuisin`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, jsonData);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/x-cuisinessentiel',
                dialogTitle: 'Sauvegarder mes recettes'
            });
        }

        return {
            success: true,
            count: recettes.length,
            fileName: fileName
        };
    } catch (error) {
        console.error('Erreur export:', error);
        return {
            success: false,
            error: 'Impossible d\'exporter les recettes.'
        };
    }
};

/**
 * Exporter une seule recette
 */
export const exportSingleRecette = async (recetteId, titre) => {
    try {
        // Vérifier premium pour l'export
        const check = premiumManager.canAccessFeature('export');
        if (!check.canAccess) {
            return {
                success: false,
                error: check.reason,
                isPremiumRequired: true
            };
        }

        // Exporter la recette
        const exportData = await db.exportRecette(recetteId);
        
        const fileName = `${titre.replace(/[^a-z0-9]/gi, '_')}.cuisin`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(
            fileUri,
            JSON.stringify(exportData, null, 2)
        );
        
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/x-cuisinessentiel',
                dialogTitle: `Partager la recette : ${titre}`,
                UTI: 'com.cordycepscreation.cuisinessentiel'
            });
        }
        
        return {
            success: true,
            fileName: fileName
        };
    } catch (error) {
        console.error('Erreur export single:', error);
        return {
            success: false,
            error: 'Impossible de partager la recette'
        };
    }
};

/**
 * Exporter une sélection de recettes
 */
export const exportSelectedRecettes = async (selectedRecettes) => {
    try {
        // Vérifier premium pour l'export
        const check = premiumManager.canAccessFeature('export');
        if (!check.canAccess) {
            return {
                success: false,
                error: check.reason,
                isPremiumRequired: true
            };
        }

        const exportData = await db.exportRecettes(selectedRecettes);
        
        const fileName = `recettes_${selectedRecettes.length}.cuisin`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(
            fileUri,
            JSON.stringify(exportData, null, 2)
        );
        
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/x-cuisinessentiel',
                dialogTitle: `Partager ${selectedRecettes.length} recette${selectedRecettes.length > 1 ? 's' : ''}`,
                UTI: 'com.cordycepscreation.cuisinessentiel'
            });
        }
        
        return {
            success: true,
            count: selectedRecettes.length,
            fileName: fileName
        };
    } catch (error) {
        console.error('Erreur export selection:', error);
        return {
            success: false,
            error: 'Impossible de partager les recettes'
        };
    }
};

/**
 * Importer des recettes (fusionner ou remplacer)
 */
export const importRecettes = async (replace = false) => {
    try {
        // Vérifier premium pour l'import
        const check = premiumManager.canAccessFeature('import');
        if (!check.canAccess) {
            return {
                success: false,
                error: check.reason,
                isPremiumRequired: true
            };
        }

        // Sélectionner un fichier
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/json', 'application/x-cuisinessentiel', '*/*'],
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(fileContent);

        // Validation du fichier
        if (!data.recettes || !Array.isArray(data.recettes)) {
            return {
                success: false,
                error: 'Format de fichier invalide.'
            };
        }

        if (data.appName && data.appName !== 'Cuisin\'essentiel') {
            return {
                success: false,
                error: 'Ce fichier ne provient pas de Cuisin\'essentiel.'
            };
        }

        // ✅ Vérifier la limite AVANT d'importer
        const currentCount = await db.countRecettes();
        const recettesToImport = data.recettesCount || data.recettes?.length || 0;
        const futureCount = replace ? recettesToImport : (currentCount + recettesToImport);
        
        // Si pas premium et dépassement
        if (!premiumManager.isPremium() && futureCount > premiumManager.getRecetteLimit()) {
            return {
                success: false,
                error: `Ce fichier contient ${recettesToImport} recette(s).\n\nVous avez actuellement ${currentCount} recette(s), et la limite gratuite est de ${premiumManager.getRecetteLimit()}.\n\nPassez Premium pour importer un nombre illimité de recettes !`,
                isPremiumRequired: true
            };
        }

        // Effectuer l'import
        if (replace) {
            await db.deleteAllRecettes();
        }

        let imported = 0;
        for (const recette of data.recettes) {
            await db.addRecette(recette);
            imported++;
        }

        return {
            success: true,
            imported: imported,
            replaced: replace
        };
    } catch (error) {
        console.error('Erreur import:', error);
        return {
            success: false,
            error: 'Impossible d\'importer les recettes.\n\nAssurez-vous que le fichier est valide.'
        };
    }
};