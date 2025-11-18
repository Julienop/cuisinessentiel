// screens/ExportImportScreen.js
// Écran pour exporter et importer les recettes

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import premiumManager from '../utils/premiumManager';

export default function ExportImportScreen({ navigation }) {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    /**
     * Exporter les recettes
     */
    const handleExport = async () => {
        try {
            setExporting(true);
            const FileSystem = require('expo-file-system/legacy');
            const exportData = await db.exportAllRecettes();
            
            const date = new Date().toISOString().split('T')[0];
            const fileName = `cuisinessentiel-backup-${date}.cuisin`;
            const fileUri = FileSystem.cacheDirectory + fileName;
            
            await FileSystem.writeAsStringAsync(
                fileUri,
                JSON.stringify(exportData, null, 2)
            );
            
            console.log('✅ Fichier créé:', fileUri);
            
            const canShare = await Sharing.isAvailableAsync();
            
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    // ✅ CHANGEMENT : MIME type personnalisé
                    mimeType: 'application/x-cuisinessentiel',
                    dialogTitle: 'Sauvegarder mes recettes'
                });
                
                Alert.alert(
                    '✅ Export réussi !',
                    `${exportData.recettesCount} recette(s) exportée(s).\n\nVous pouvez maintenant sauvegarder ce fichier sur Drive, l'envoyer par email, etc.`
                );
            } else {
                Alert.alert('Export réussi', `Fichier sauvegardé :\n${fileUri}`);
            }
        } catch (error) {
            console.error('Erreur export:', error);
            Alert.alert('Erreur', 'Impossible d\'exporter les recettes.');
        } finally {
            setExporting(false);
        }
    };

    /**
     * Importer les recettes (ajouter sans supprimer)
     */
    const handleImport = async () => {
        try {
            setImporting(true);

            // Sélectionner un fichier
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'application/x-cuisinessentiel'],
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                setImporting(false);
                return;
            }

            // Import dynamique de l'API legacy
            const FileSystem = require('expo-file-system/legacy');

            // Lire le fichier
            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
            const importData = JSON.parse(fileContent);

            // Vérifier que c'est bien un fichier Cuisin'essentiel
            if (importData.appName !== 'Cuisin\'essentiel') {
                Alert.alert(
                    'Erreur',
                    'Ce fichier ne semble pas être une sauvegarde Cuisin\'essentiel.'
                );
                setImporting(false);
                return;
            }

            // Vérifier la limite avec le nombre de recettes à importer
            const currentCount = await db.countRecettes();
            const recettesToImport = importData.recettesCount || importData.recettes?.length || 0;
            const futureCount = currentCount + recettesToImport;
            
            const check = await premiumManager.canAddRecette(futureCount - 1); // -1 car canAddRecette vérifie si on peut ajouter 1 recette
            
            if (!check.canAdd) {
                Alert.alert(
                    'Limite atteinte',
                    `Ce fichier contient ${recettesToImport} recette(s).\n\nVous avez actuellement ${currentCount} recette(s), et la limite gratuite est de ${premiumManager.getRecetteLimit()}.\n\nPassez Premium pour importer un nombre illimité de recettes !`,
                    [
                        { text: 'Plus tard' },
                        { 
                            text: 'Passer Premium',
                            onPress: () => {
                                // TODO: Ouvrir l'écran Premium
                                console.log('Redirection vers Premium à implémenter');
                            }
                        }
                    ]
                );
                setImporting(false);
                return;
            }

            // Importer (sans remplacer)
            const stats = await db.importRecettes(importData, false);

            Alert.alert(
                '✅ Import réussi !',
                `${stats.imported} nouvelle(s) recette(s) importée(s)\n${stats.skipped} recette(s) déjà existante(s)\n${stats.errors} erreur(s)`,
                [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]
            );
        } catch (error) {
            console.error('Erreur import:', error);
            Alert.alert(
                'Erreur',
                'Impossible d\'importer le fichier. Vérifiez qu\'il s\'agit bien d\'une sauvegarde valide.'
            );
        } finally {
            setImporting(false);
        }
    };

    /**
     * Importer en remplaçant toutes les données
     */
    const handleImportReplace = async () => {
        Alert.alert(
            '⚠️ Attention',
            'Cette action va SUPPRIMER toutes vos recettes actuelles et les remplacer par celles du fichier.\n\nÊtes-vous sûr ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Remplacer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setImporting(true);

                            // Sélectionner un fichier
                            const result = await DocumentPicker.getDocumentAsync({
                                type: ['application/json', 'application/x-cuisinessentiel'],  // ✅ Accepter les deux
                                copyToCacheDirectory: true
                            });

                            if (result.canceled) {
                                setImporting(false);
                                return;
                            }

                            // Import dynamique de l'API legacy
                            const FileSystem = require('expo-file-system/legacy');

                            // Lire le fichier
                            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
                            const importData = JSON.parse(fileContent);

                            // Vérifier que c'est bien un fichier Cuisin'essentiel
                            if (importData.appName !== 'Cuisin\'essentiel') {
                                Alert.alert(
                                    'Erreur',
                                    'Ce fichier ne semble pas être une sauvegarde Cuisin\'essentiel.'
                                );
                                setImporting(false);
                                return;
                            }

                            // Vérifier la limite avec le nombre de recettes à importer
                            const currentCount = await db.countRecettes();
                            const recettesToImport = importData.recettesCount || importData.recettes?.length || 0;
                            const futureCount = currentCount + recettesToImport;
                            
                            const check = await premiumManager.canAddRecette(futureCount - 1); // -1 car canAddRecette vérifie si on peut ajouter 1 recette
                            
                            if (!check.canAdd) {
                                Alert.alert(
                                    'Limite atteinte',
                                    `Ce fichier contient ${recettesToImport} recette(s).\n\nVous avez actuellement ${currentCount} recette(s), et la limite gratuite est de ${premiumManager.getRecetteLimit()}.\n\nPassez Premium pour importer un nombre illimité de recettes !`,
                                    [
                                        { text: 'Plus tard' },
                                        { 
                                            text: 'Passer Premium',
                                            onPress: () => {
                                                // TODO: Ouvrir l'écran Premium
                                                console.log('Redirection vers Premium à implémenter');
                                            }
                                        }
                                    ]
                                );
                                setImporting(false);
                                return;
                            }

                            // Importer (avec remplacement)
                            const stats = await db.importRecettes(importData, true);

                            Alert.alert(
                                '✅ Restauration réussie !',
                                `${stats.imported} recette(s) restaurée(s)`,
                                [
                                    { text: 'OK', onPress: () => navigation.goBack() }
                                ]
                            );
                        } catch (error) {
                            console.error('Erreur import:', error);
                            Alert.alert(
                                'Erreur',
                                'Impossible d\'importer le fichier.'
                            );
                        } finally {
                            setImporting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Introduction */}
                <View style={styles.section}>
                    <Text style={styles.title}>Sauvegarde & Restauration</Text>
                    <Text style={styles.description}>
                        Exportez vos recettes pour les sauvegarder ou les transférer sur un autre appareil.
                    </Text>
                </View>

                {/* Export */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📤 Exporter mes recettes</Text>
                    <Text style={styles.sectionDescription}>
                        Créez une sauvegarde de toutes vos recettes dans un fichier JSON.
                    </Text>
                    
                    <TouchableOpacity
                        style={[styles.primaryButton, exporting && styles.buttonDisabled]}
                        onPress={handleExport}
                        disabled={exporting || importing}
                    >
                        {exporting ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <Text style={styles.primaryButtonText}>Exporter toutes mes recettes</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 Le fichier pourra être sauvegardé sur Drive, envoyé par email, etc.
                        </Text>
                    </View>
                </View>

                {/* Import */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📥 Importer des recettes</Text>
                    <Text style={styles.sectionDescription}>
                        Restaurez une sauvegarde précédente ou importez des recettes depuis un autre appareil.
                    </Text>

                    <TouchableOpacity
                        style={[styles.secondaryButton, importing && styles.buttonDisabled]}
                        onPress={handleImport}
                        disabled={exporting || importing}
                    >
                        {importing ? (
                            <ActivityIndicator color={COLORS.text} />
                        ) : (
                            <Text style={styles.secondaryButtonText}>Ajouter des recettes</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dangerButton, importing && styles.buttonDisabled]}
                        onPress={handleImportReplace}
                        disabled={exporting || importing}
                    >
                        {importing ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <Text style={styles.dangerButtonText}>Remplacer toutes mes recettes</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>
                            ⚠️ "Remplacer" supprime toutes vos recettes actuelles !
                        </Text>
                    </View>
                </View>

                {/* Comment ça marche */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💡 Comment ça marche ?</Text>
                    
                    <View style={styles.step}>
                        <Text style={styles.stepNumber}>1</Text>
                        <Text style={styles.stepText}>
                            <Text style={styles.stepBold}>Sur l'ancien téléphone :</Text> Exportez vos recettes
                        </Text>
                    </View>

                    <View style={styles.step}>
                        <Text style={styles.stepNumber}>2</Text>
                        <Text style={styles.stepText}>
                            <Text style={styles.stepBold}>Sauvegardez le fichier :</Text> Drive, email, WhatsApp...
                        </Text>
                    </View>

                    <View style={styles.step}>
                        <Text style={styles.stepNumber}>3</Text>
                        <Text style={styles.stepText}>
                            <Text style={styles.stepBold}>Sur le nouveau téléphone :</Text> Importez le fichier
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: COLORS.accent,
        lineHeight: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 15,
        color: COLORS.accent,
        lineHeight: 22,
        marginBottom: 16,
    },
    primaryButton: {
        backgroundColor: COLORS.text,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: COLORS.white,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    dangerButton: {
        backgroundColor: '#DC2626',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    dangerButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    infoBox: {
        backgroundColor: '#E8F4FD',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#B3D9F2',
    },
    infoText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
    },
    warningBox: {
        backgroundColor: '#FFF9E6',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE4A3',
    },
    warningText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
        fontWeight: '500',
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.text,
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 32,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 24,
    },
    stepBold: {
        fontWeight: '600',
    },
});