// screens/SettingsScreen.js
// Écran de paramètres de l'application

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import { Ionicons } from '@expo/vector-icons';

// Version de l'app (à mettre à jour manuellement)
const APP_VERSION = '1.0.0';

export default function SettingsScreen({ navigation }) {
    const [aboutModalVisible, setAboutModalVisible] = useState(false);
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [compatibilityModalVisible, setCompatibilityModalVisible] = useState(false);

    // ========== EXPORT DE LA BASE DE DONNÉES ==========
    const handleExport = async () => {
        try {
            const recettes = await db.getAllRecettes();
            
            if (recettes.length === 0) {
                Alert.alert('Aucune recette', 'Vous n\'avez aucune recette à exporter.');
                return;
            }

            const data = {
                version: APP_VERSION,
                exportDate: new Date().toISOString(),
                recettes: recettes,
            };

            const jsonData = JSON.stringify(data, null, 2);
            const fileName = `cuisinEssentiel_backup_${new Date().toISOString().split('T')[0]}.json`;
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, jsonData);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Succès', `Fichier sauvegardé : ${fileUri}`);
            }
        } catch (error) {
            console.error('Erreur export:', error);
            Alert.alert('Erreur', 'Impossible d\'exporter les recettes.');
        }
    };

    // ========== IMPORT DE LA BASE DE DONNÉES ==========
    const handleImport = async () => {
        Alert.alert(
            'Importer des recettes',
            'Voulez-vous remplacer toutes vos recettes ou fusionner avec les existantes ?',
            [
                {
                    text: 'Annuler',
                    style: 'cancel',
                },
                {
                    text: 'Fusionner',
                    onPress: () => importRecettes(false),
                },
                {
                    text: 'Remplacer',
                    onPress: () => importRecettes(true),
                    style: 'destructive',
                },
            ]
        );
    };

    const importRecettes = async (replace = false) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const fileUri = result.assets[0].uri;
            const fileContent = await FileSystem.readAsStringAsync(fileUri);
            const data = JSON.parse(fileContent);

            if (!data.recettes || !Array.isArray(data.recettes)) {
                Alert.alert('Erreur', 'Format de fichier invalide.');
                return;
            }

            if (replace) {
                await db.deleteAllRecettes();
            }

            let imported = 0;
            for (const recette of data.recettes) {
                await db.addRecette(recette);
                imported++;
            }

            Alert.alert(
                'Succès',
                `${imported} recette(s) importée(s) avec succès !`,
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
            );
        } catch (error) {
            console.error('Erreur import:', error);
            Alert.alert('Erreur', 'Impossible d\'importer les recettes.');
        }
    };

    // ========== RÉINITIALISATION DE L'APP ==========
    const handleReset = () => {
        Alert.alert(
            '⚠️ Réinitialiser l\'application',
            'Cette action supprimera TOUTES vos recettes de manière définitive. Voulez-vous continuer ?',
            [
                {
                    text: 'Annuler',
                    style: 'cancel',
                },
                {
                    text: 'Réinitialiser',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.deleteAllRecettes();
                            Alert.alert(
                                'Succès',
                                'L\'application a été réinitialisée.',
                                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
                            );
                        } catch (error) {
                            console.error('Erreur reset:', error);
                            Alert.alert('Erreur', 'Impossible de réinitialiser l\'application.');
                        }
                    },
                },
            ]
        );
    };

    // ========== CONTACT ==========
    const handleContact = () => {
        const email = 'contact@cordyceps-creation.fr';
        const subject = 'Contact depuis Cuisin\'Essentiel';
        const body = 'Bonjour,\n\n';
        
        Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    // ========== RENDER ==========
    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView style={styles.container}>
                
                {/* Section Informations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Informations</Text>
                    
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setAboutModalVisible(true)}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="information-circle-outline" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>À propos</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setCompatibilityModalVisible(true)}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="at" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>Compatibilités</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>

                    <View style={styles.menuItem}>
                        <View style={styles.menuItemContent}>
                            <Ionicons name="phone-portrait-outline" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>Version</Text>
                        </View>
                        <Text style={styles.menuItemValue}>{APP_VERSION}</Text>
                    </View>
                </View>

                {/* Section Contact & Légal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact & Légal</Text>
                    
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleContact}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="mail-outline" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>Me contacter</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setPrivacyModalVisible(true)}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>Politique de confidentialité</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                </View>

                {/* Section Données */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Données</Text>
                    
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleExport}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>Exporter mes recettes</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleImport}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="cloud-download-outline" size={20} color={COLORS.marron} />
                            <Text style={styles.menuItemText}>Importer des recettes</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>

                </View>

                {/* Section Danger */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Réinitialisation</Text>
                    
                    <TouchableOpacity
                        style={[styles.menuItem, styles.dangerItem]}
                        onPress={handleReset}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                            <Text style={styles.dangerText}>Réinitialiser l'application</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Cuisin'Essentiel</Text>
                    <View style={styles.footerIconRow}>
                        <Text style={styles.footerText}>Mitonné avec</Text>
                        <Ionicons name="heart" size={14} color="#dc7226ff" />
                    </View>
                </View>

            </ScrollView>

            {/* ========== MODAL À PROPOS ========== */}
            <Modal
                visible={aboutModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAboutModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>À propos</Text>
                        
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>
                                <Text style={styles.modalBold}>Cuisin'Essentiel</Text> est votre compagnon de cuisine personnel.
                                {'\n\n'}
                                <Ionicons name="phone-portrait" size={16} color={COLORS.marron} /> <Text style={styles.modalBold}>Fonctionnalités :</Text>
                                {'\n'}• Importez des recettes depuis n'importe quel site web
                                {'\n'}• Créez vos propres recettes manuellement
                                {'\n'}• Ajustez les portions automatiquement
                                {'\n'}• Partagez facilement vos recettes
                                {'\n'}• Mode cuisson avec timers intégrés
                                {'\n'}• Liste de courses intelligente
                                {'\n'}• Catégorisation automatique
                                {'\n'}• Recherche et filtres avancés
                                {'\n\n'}
                                <Ionicons name="restaurant" size={16} color={COLORS.marron} /> <Text style={styles.modalBold}>Ma mission :</Text>
                                {'\n'}
                                Rendre la cuisine accessible et organisée pour tous. Vos recettes, toujours dans votre poche, sans connexion internet nécessaire.
                                {'\n\n'}
                                <Ionicons name="save" size={16} color={COLORS.marron} /> <Text style={styles.modalBold}>Vos données :</Text>
                                {'\n'}
                                Toutes vos recettes sont stockées localement sur votre appareil. Aucune donnée n'est envoyée à des serveurs externes.
                            </Text>
                        </ScrollView>
                        
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setAboutModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ========== MODAL Compatibilités ========== */}
            <Modal
                visible={compatibilityModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCompatibilityModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Compatibilités</Text>
                        
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>
                                <Text style={styles.modalBold}>Cuisin'Essentiel</Text> est compatible avec la plupart des sites de cuisine français.
                                {'\n\n'}
                                <Ionicons name="cloud" size={16} color={COLORS.marron} /> <Text style={styles.modalBold}>Sites vérifiés avec succès :</Text>
                                {'\n'}• Marmiton
                                {'\n'}• 750g
                                {'\n'}• Cuisine AZ
                                {'\n'}• HelloFresh
                                {'\n'}• Magimix
                                {'\n'}• Cookomix
                                {'\n'}• Jow
                                {'\n'}• Pains Jacquet
                                {'\n'}• Recettes de Cuisine.tv
                                {'\n'}• Cuisine Actuelle
                                {'\n'}• Papilles et Pupilles
                                {'\n'}• Chef Simon
                                {'\n'}• Ricardo Cuisine
                                {'\n'}• Femme Actuelle
                                {'\n'}• Ptitchef
                                {'\n'}• Journal des Femmes
                                {'\n'}• ChefNini
                                {'\n'}• Undejeunerausoleil
                                {'\n'}• Hervé Cuisine
                                {'\n'}• Ptitchef
                                {'\n'}• La cuisine de Dey
                                {'\n'}• Aux Délices Du Palais
                                {'\n'}• Les foodies
                                {'\n'}• Délices d'un novice
                                {'\n'}• Amandine Cooking
                                {'\n'}• Il était une fois la patisserie
                                {'\n'}• Lidl recettes
                                {'\n'}• Vegan pratique
                                {'\n'}• Elle
                                {'\n'}• Perle en sucre
                                {'\n'}• Les délices de Karinette
                                {'\n\n'}
                                <Ionicons name="cloud-offline" size={16} color={COLORS.marron} /> <Text style={styles.modalBold}>Sites incompatibles :</Text>
                                {'\n'}• La cuisine de Bernard
                                {'\n'}• Carrefour recettes
                                {'\n\n'}
                                <Ionicons name="information-circle" size={16} color={COLORS.marron} /> <Text style={styles.modalBold}>A savoir :</Text>
                                {'\n'}
                                Si vous ne voyez pas votre site de cuisine préféré dans cette liste, ne vous en faites pas, bien d'autres sites sont compatibles via les méthodes d'extraction utilisées !
                            </Text>
                        </ScrollView>
                        
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setCompatibilityModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ========== MODAL POLITIQUE DE CONFIDENTIALITÉ ========== */}
            <Modal
                visible={privacyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPrivacyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Politique de confidentialité</Text>
                        
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>
                                <Text style={styles.modalBold}>Dernière mise à jour : {new Date().toLocaleDateString()}</Text>
                                {'\n\n'}
                                <Text style={styles.modalBold}>1. Collecte de données</Text>
                                {'\n'}
                                Cuisin'Essentiel ne collecte AUCUNE donnée personnelle. L'application fonctionne entièrement hors ligne.
                                {'\n\n'}
                                <Text style={styles.modalBold}>2. Stockage des données</Text>
                                {'\n'}
                                Toutes vos recettes sont stockées localement sur votre appareil dans une base de données SQLite. Aucune synchronisation cloud n'est effectuée.
                                {'\n\n'}
                                <Text style={styles.modalBold}>3. Partage de données</Text>
                                {'\n'}
                                Vos données ne sont jamais partagées avec des tiers. Lorsque vous utilisez la fonction d'import depuis une URL, seul le contenu de la page web est récupéré, aucune donnée personnelle n'est transmise.
                                {'\n\n'}
                                <Text style={styles.modalBold}>4. Sécurité</Text>
                                {'\n'}
                                Vos données sont protégées par les mécanismes de sécurité de votre système d'exploitation. Je vous recommandes d'exporter régulièrement vos recettes en sauvegarde.
                                {'\n\n'}
                                <Text style={styles.modalBold}>5. Vos droits</Text>
                                {'\n'}
                                Vous pouvez à tout moment :
                                {'\n'}• Exporter toutes vos données (fonction Export)
                                {'\n'}• Supprimer toutes vos données (fonction Réinitialiser)
                                {'\n'}• Désinstaller l'application sans laisser de traces
                                {'\n\n'}
                                <Text style={styles.modalBold}>6. Contact</Text>
                                {'\n'}
                                Pour toute question concernant vos données, contactez-moi via le bouton "Me contacter" dans les paramètres.
                            </Text>
                        </ScrollView>
                        
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setPrivacyModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
    },
    section: {
        marginTop: 16,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.beigeclair,
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: COLORS.text,
    },
    menuItemValue: {
        fontSize: 16,
        color: COLORS.accent,
    },
    dangerItem: {
        borderColor: '#dc7226ff',
    },
    dangerText: {
        fontSize: 16,
        color: COLORS.red,
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
        padding: 32,
        gap: 4,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.accent,
    },
    footerIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    // Styles modaux
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
    },
    modalScroll: {
        maxHeight: 400,
    },
    modalText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
    },
    modalBold: {
        fontWeight: '600',
    },
    modalButton: {
        backgroundColor: COLORS.marron,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    modalButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
});