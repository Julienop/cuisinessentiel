// screens/ImportURLScreen.js
// Écran d'import de recette depuis URL - VERSION PHASE 2 INTÉGRÉE

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { COLORS } from '../constants/colors';
    import { extractRecipeFromUrl, isValidRecipe } from '../extractors/recipeExtractor';
    import db from '../database/db';
    import { Ionicons } from '@expo/vector-icons';
    import premiumManager from '../utils/premiumManager';

    export default function ImportURLScreen({ navigation }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleImport = async () => {
        if (!url.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir une URL');
        return;
        }

        // Validation URL basique
        try {
        new URL(url);
        } catch (error) {
        Alert.alert('Erreur', 'L\'URL saisie n\'est pas valide');
        return;
        }

        // Vérifier la limite avant d'extraire
        const count = await db.countRecettes();
        const check = await premiumManager.canAddRecette(count);
        
        if (!check.canAdd) {
            Alert.alert(
                'Limite atteinte',
                check.reason,
                [
                    { text: 'Plus tard' },
                    { 
                        text: 'Passer Premium',
                        onPress: () => navigation.navigate('Premium')
                    }
                ]
            );
            return;
        }

        setLoading(true);
        setStatusMessage('');

        try {

        console.log('🔍 Extraction de la recette depuis:', url);
        setStatusMessage('Téléchargement de la page...');
        
        // Extraire la recette avec le module
        const recipeData = await extractRecipeFromUrl(url);
        
        // 🔍 AJOUTE CES LOGS ICI
        console.log('📊 Données extraites:');
        console.log('Titre:', recipeData.titre);
        console.log('Nombre d\'ingrédients:', recipeData.ingredients?.length);
        console.log('Ingrédients:', recipeData.ingredients);
        console.log('Nombre d\'instructions:', recipeData.instructions?.length);
        console.log('Instructions:', recipeData.instructions);
        console.log('Temps préparation:', recipeData.temps_preparation);
        console.log('Temps cuisson:', recipeData.temps_cuisson);
        console.log('Portions:', recipeData.nombre_portions);

        // Vérifier que la recette est valide
        if (!isValidRecipe(recipeData)) {
            throw new Error('Recette incomplète ou invalide');
        }

        setStatusMessage('Enregistrement...');
        
        // Enregistrer la recette dans la base de données
        console.log('💾 Enregistrement dans la base de données...');
        const recetteId = await db.addRecette(recipeData);

        setLoading(false);
        setStatusMessage('');

        // Afficher un message de succès
        Alert.alert(
            'Succès ! ✨',
            `La recette "${recipeData.titre}" a été importée avec succès !\n\n${recipeData.ingredients.length} ingrédients\n${recipeData.instructions.length} étapes`,
            [
            {
                text: 'Voir la recette',
                onPress: () => {
                navigation.replace('RecetteDetail', { recetteId });
                },
            },
            {
                text: 'Importer une autre',
                onPress: () => setUrl(''),
            },
            ]
        );

        } catch (error) {
        setLoading(false);
        setStatusMessage('');
        console.error('❌ Erreur extraction:', error);
        
        // Messages d'erreur personnalisés
        let errorMessage = error.message;
        
        if (error.message.includes('Impossible de charger')) {
            errorMessage = 'Impossible d\'accéder à cette page.\nVérifiez votre connexion internet.';
        } else if (error.message.includes('incomplète')) {
            errorMessage = 'La recette ne contient pas assez d\'informations.\nEssayez une autre URL ou utilisez l\'ajout manuel.';
        }
        
        Alert.alert(
            'Erreur d\'extraction',
            errorMessage,
            [
            {
                text: 'Ajout manuel',
                onPress: () => navigation.navigate('AddRecette'),
            },
            { text: 'Réessayer' },
            {
                text: 'Abandonner',
                onPress: () => navigation.goBack()  // Retour à l'écran précédent
            },
            ]
        );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.container}>
            <View style={styles.content}>
            <View style={styles.headerBox}>
                <Text style={styles.headerTitle}>Importer une recette</Text>
                <Text style={styles.headerSubtitle}>
                    Copiez le lien d'une recette depuis votre navigateur et collez-le ci-dessous !
                </Text>
                <View style={styles.arrow}>
                    <Ionicons name="arrow-down-circle" size={32} color={COLORS.green} />
                </View>
            </View>

            {/* <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>✨ Sites supportés</Text>
                <Text style={styles.infoText}>
                • Marmiton{'\n'}
                • 750g{'\n'}
                • Cuisine AZ{'\n'}
                • Et la plupart des sites utilisant Schema.org
                </Text>
            </View> */}

            <View style={styles.formGroup}>
                <TextInput
                    style={styles.input}
                    value={url}
                    onChangeText={setUrl}
                    placeholder="https://www.exemple/recette"
                    placeholderTextColor={COLORS.accent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!loading}
                />
                
                {/* AJOUTE CE BOUTON D'EXEMPLE */}
                <TouchableOpacity 
                    style={styles.exampleButton}
                    onPress={() => setUrl('https://www.marmiton.org/recettes/recette_gateau-au-chocolat-fondant-rapide_166352.aspx')}
                >
                    <Ionicons name="arrow-redo-outline" size={20} color={COLORS.text} />
                    <Text style={styles.exampleButtonText}>Essayer avec un exemple</Text>
                </TouchableOpacity>

                <Text style={styles.headerSubtitle}>
                    Appuyez ensuite sur le bouton "Importer"
                </Text>
            </View>

            {loading && (
                <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.text} />
                {statusMessage && (
                    <Text style={styles.statusText}>{statusMessage}</Text>
                )}
                </View>
            )}

            {!loading && (
                <>
                <View style={styles.featuresList}>
                    <Text style={styles.featuresTitle}>Ce qui sera extrait automatiquement :</Text>
                    <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={20} color={COLORS.green} />
                    <Text style={styles.featureText}>Titre de la recette</Text>
                    </View>
                    <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={20} color={COLORS.green} />
                    <Text style={styles.featureText}>Liste des ingrédients avec quantités</Text>
                    </View>
                    <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={20} color={COLORS.green} />
                    <Text style={styles.featureText}>Étapes de préparation</Text>
                    </View>
                    <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={20} color={COLORS.green} />
                    <Text style={styles.featureText}>Temps de préparation et cuisson</Text>
                    </View>
                    <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={20} color={COLORS.green} />
                    <Text style={styles.featureText}>Nombre de portions</Text>
                    </View>
                </View>

                <View style={styles.tipBox}>
                    {/* <Ionicons name="bulb-outline" size={16} color={COLORS.text} /> */}
                    <Text style={styles.tipTitle}>Astuce</Text>
                    <Text style={styles.tipText}>
                    Si ça ne fonctionne pas, vous pouvez toujours créer la recette manuellement !
                    </Text>
                </View>
                </>
            )}
            </View>
        </ScrollView>

        <View style={styles.actionsContainer}>
            <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
            >
            <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={[styles.importButton, loading && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={loading}
            >
            <Text style={styles.importButtonText}>
                {loading ? 'Extraction en cours...' : 'Importer'}
            </Text>
            </TouchableOpacity>
        </View>
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
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 16,
    },
    headerBox: {
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    headerSubtitle: {
        fontSize: 15,
        color: COLORS.accent,
        lineHeight: 22,
        paddingBottom: 8,
    },
    infoBox: {
        backgroundColor: '#F0F9FF',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginBottom: 24,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 22,
    },
    formGroup: {
        marginBottom: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        marginTop: 0,
        fontSize: 16,
        color: COLORS.text,
    },
    loadingBox: {
        alignItems: 'center',
        paddingVertical: 32,
        marginBottom: 24,
    },
    statusText: {
        marginTop: 16,
        fontSize: 14,
        color: COLORS.accent,
    },
    featuresList: {
        marginVertical: 0,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    featureIcon: {
        fontSize: 18,
        color: '#22C55E',
        marginRight: 12,
        width: 24,
    },
    featureText: {
        fontSize: 15,
        color: COLORS.text,
    },
    tipBox: {
        backgroundColor: '#FFF9E6',
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE4A3',
        marginBottom: 24,
    },
    tipTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 6,
    },
    tipText: {
        fontSize: 13,
        color: COLORS.text,
        lineHeight: 18,
    },
    actionsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.beige,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    importButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: COLORS.marron,
        alignItems: 'center',
    },
    importButtonDisabled: {
        opacity: 0.5,
    },
    importButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.background,
    },
    exampleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginVertical: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: COLORS.beige,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    exampleButtonText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    arrow: {
        flexDirection: 'row',
        justifyContent: 'center',
    }
});