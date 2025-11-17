// utils/deepLinking.js
import { Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import db from '../database/db';

/**
 * Configure le listener pour les fichiers .cuisin
 */
export function setupDeepLinking(navigation) {
    if (!navigation) {
        console.warn('⚠️ Navigation non disponible');
        return () => {};
    }

    console.log('🔗 Deep linking configuré');

    // URL initiale (app fermée)
    Linking.getInitialURL()
        .then((url) => {
            if (url) {
                console.log('📥 URL initiale:', url);
                handleFileOpen(url, navigation);
            }
        })
        .catch((error) => console.error('Erreur getInitialURL:', error));

    // URL quand l'app est ouverte
    const subscription = Linking.addEventListener('url', (event) => {
        if (event?.url) {
            console.log('📥 URL reçue:', event.url);
            handleFileOpen(event.url, navigation);
        }
    });

    return () => {
        if (subscription?.remove) {
            subscription.remove();
        }
    };
}

/**
 * Gère l'ouverture d'un fichier .cuisin
 */
async function handleFileOpen(url, navigation) {
    try {
        console.log('📥 Traitement fichier:', url);

        let filePath = url;
        if (url.startsWith('file://')) {
            filePath = url.replace('file://', '');
        }

        const fileContent = await FileSystem.readAsStringAsync(filePath);
        const importData = JSON.parse(fileContent);

        if (importData?.appName !== 'Cuisin\'essentiel') {
            Alert.alert('Fichier invalide', 'Ce fichier ne semble pas être une sauvegarde Cuisin\'essentiel.');
            return;
        }

        Alert.alert(
            'Importer des recettes ?',
            `Ce fichier contient ${importData.recettesCount || 0} recette(s).\n\nVoulez-vous les importer ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Importer',
                    onPress: async () => {
                        try {
                            const stats = await db.importRecettes(importData, false);
                            Alert.alert(
                                'Import réussi !',
                                `${stats.imported} recette(s) importée(s)\n${stats.skipped} ignorée(s)`,
                                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
                            );
                        } catch (error) {
                            console.error('Erreur import:', error);
                            Alert.alert('Erreur', `Impossible d'importer: ${error.message}`);
                        }
                    }
                }
            ]
        );
    } catch (error) {
        console.error('Erreur ouverture fichier:', error);
        Alert.alert('Erreur', `Impossible de lire le fichier: ${error.message}`);
    }
}