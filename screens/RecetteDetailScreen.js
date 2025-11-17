// screens/RecetteDetailScreen.js
// Écran d'affichage des détails d'une recette

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Share,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import { recalculateIngredients } from '../utils/portionCalculator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

export default function RecetteDetailScreen({ navigation, route }) {
    const { recetteId } = route.params;
    const [recette, setRecette] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPortions, setSelectedPortions] = useState(null);
    const [adjustedIngredients, setAdjustedIngredients] = useState([]);
    const isFirstLoad = useRef(true);

    useFocusEffect(
        useCallback(() => {
            loadRecette();
        }, [recetteId])
    );

    useEffect(() => {
            isFirstLoad.current = true;
        }, [recetteId]);

    const loadRecette = async () => {
        try {
            const data = await db.getRecetteById(recetteId);
            setRecette(data);
            
            // Ne réinitialiser les portions et ingrédients que lors du premier chargement
            if (isFirstLoad.current) {
                setSelectedPortions(data.nombre_portions || 4);
                setAdjustedIngredients(data.ingredients);
                isFirstLoad.current = false;
            }
            // Sinon, on ne touche pas aux portions et ingrédients ajustés existants
        } catch (error) {
            console.error('Erreur chargement recette:', error);
            Alert.alert('Erreur', 'Impossible de charger la recette');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavori = async () => {
        try {
            await db.toggleFavori(recetteId);
            await loadRecette();
        } catch (error) {
            console.error('Erreur toggle favori:', error);
        }
    };

    const handleIncreasePortions = () => {
        const newPortions = selectedPortions + 1;
        updatePortions(newPortions);
    };

    const handleDecreasePortions = () => {
        if (selectedPortions > 1) {
            const newPortions = selectedPortions - 1;
            updatePortions(newPortions);
        }
    };

    const updatePortions = (newPortions) => {
        setSelectedPortions(newPortions);
        // Recalculer les ingrédients
        console.log('📊 TOUS les ingrédients avant recalcul:', JSON.stringify(recette.ingredients, null, 2));
        const portionsOriginales = recette.nombre_portions_original || recette.nombre_portions || 4;
        const newIngredients = recalculateIngredients(
            recette.ingredients,
            portionsOriginales,
            newPortions
        );
        setAdjustedIngredients(newIngredients);
    };

    const handleEdit = () => {
        navigation.navigate('RecetteEdit', { recetteId });
    };

    const handleDelete = () => {
        Alert.alert(
            'Supprimer la recette',
            'Êtes-vous sûr de vouloir supprimer cette recette ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.deleteRecette(recetteId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de supprimer la recette');
                        }
                    },
                },
            ]
        );
    };

    const handleShare = async () => {
        try {
            // Exporter la recette en JSON
            const exportData = await db.exportRecette(recetteId);
            
            // Créer le nom du fichier
            const fileName = `${recette.titre.replace(/[^a-z0-9]/gi, '_')}.cuisin`;  // ✅ .cuisin
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            
            // Écrire le fichier
            await FileSystem.writeAsStringAsync(
                fileUri,
                JSON.stringify(exportData, null, 2)
            );
            
            // Vérifier si le partage est disponible
            const isAvailable = await Sharing.isAvailableAsync();
            
            if (isAvailable) {
                // Partager le fichier
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/x-cuisinessentiel',  // ✅ MIME type personnalisé
                    dialogTitle: `Partager la recette : ${recette.titre}`,
                    UTI: 'com.cordycepscreation.cuisinessentiel'  // ✅ UTI personnalisé
                });
            } else {
                // Fallback : utiliser le Share natif de React Native
                await Share.share({
                    message: `Voici la recette : ${recette.titre}`,
                    title: recette.titre,
                });
            }
            
            console.log('✅ Recette partagée');
        } catch (error) {
            console.error('Erreur partage:', error);
            Alert.alert('Erreur', 'Impossible de partager la recette');
        }
    };

    const handleAddToShoppingList = async () => {
        try {
            // Utiliser les ingrédients ajustés selon le nombre de portions sélectionné
            await db.addIngredientsToShoppingList(
                adjustedIngredients, 
                recetteId, 
                `${recette.titre} (${selectedPortions} personnes)`
            );
            
            Alert.alert(
                '✅ Ajouté !',
                `Les ingrédients pour ${selectedPortions} personne${selectedPortions > 1 ? 's' : ''} ont été ajoutés à votre liste de courses`,
                [
                    { text: 'OK' },
                    { 
                        text: 'Voir la liste', 
                        onPress: () => navigation.navigate('ShoppingList')
                    }
                ]
            );
        } catch (error) {
            console.error('Erreur ajout liste:', error);
            Alert.alert('Erreur', 'Impossible d\'ajouter les ingrédients à la liste');
        }
    };

    const handleStartCooking = () => {
        navigation.navigate('CookingMode', { 
            recetteId,
            selectedPortions: selectedPortions,
            adjustedIngredients: adjustedIngredients
        });
    };

    const handlePressSource = async (url) => {
        try {
            // Vérifie si l'URL peut être ouverte (facultatif mais recommandé)
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                // Ouvre l'URL dans le navigateur par défaut
                await Linking.openURL(url);
            } else {
                console.error(`Impossible d'ouvrir l'URL: ${url}`);
                // Vous pouvez afficher une alerte à l'utilisateur ici
            }
        } catch (error) {
            console.error('Erreur lors de l\'ouverture de l\'URL:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.text} />
            </View>
        );
    }

    if (!recette) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Recette introuvable</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView}>
                {/* En-tête */}
                <View style={styles.header}>
                    <Text style={styles.titre}>{recette.titre}</Text>
                    
                    <View style={styles.metaContainer}>
                        {recette.temps_preparation && (
                            <View style={styles.metaItem}>
                                <Ionicons name="timer-outline" size={18} color={COLORS.marron} />
                                <Text style={styles.metaText}>Préparation: {recette.temps_preparation} min</Text>
                            </View>
                        )}
                        {recette.temps_cuisson && (
                            <View style={styles.metaItem}>
                                <Ionicons name="flame" size={18} color={COLORS.iconfire} />
                                <Text style={styles.metaText}>Cuisson: {recette.temps_cuisson} min</Text>
                            </View>
                        )}
                    </View>

                    {/* Sélecteur de portions */}
                    <View style={styles.portionsSelector}>
                        <Text style={styles.portionsLabel}>Portions :</Text>
                        <View style={styles.portionsControls}>
                            <TouchableOpacity
                                style={[styles.portionButton, selectedPortions <= 1 && styles.portionButtonDisabled]}
                                onPress={handleDecreasePortions}
                                disabled={selectedPortions <= 1}
                            >
                                <Ionicons name="remove" size={20} color={COLORS.background} />
                            </TouchableOpacity>
                            <Text style={styles.portionsValue}>{selectedPortions}</Text>
                            <TouchableOpacity
                                style={styles.portionButton}
                                onPress={handleIncreasePortions}
                            >
                                <Ionicons name="add" size={20} color={COLORS.background} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {recette.tags && recette.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {recette.tags.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Notes personnelles */}
                {recette.notes_personnelles && recette.notes_personnelles.trim() && (
                    <View style={styles.notesSection}>
                        <View style={styles.notesHeader}>
                            <Ionicons name="create-outline" size={20} color={COLORS.text} />
                            <Text style={styles.notesSectionTitle}>Mes notes</Text>
                        </View>
                        <Text style={styles.notesText}>{recette.notes_personnelles}</Text>
                    </View>
                )}

                {/* Ingrédients */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ingrédients</Text>
                    {adjustedIngredients.map((item, index) => (
                        <View key={index} style={styles.ingredientItem}>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
                            <Text style={styles.ingredientText}>
                                {item.quantite} {item.unite} {item.ingredient}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Instructions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Préparation</Text>
                    {recette.instructions.map((instruction, index) => (
                        <View key={index} style={styles.instructionItem}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.instructionText}>{instruction}</Text>
                        </View>
                    ))}
                </View>

                {recette.url_source && (
                    <TouchableOpacity 
                        style={styles.sourceContainer} 
                        onPress={() => handlePressSource(recette.url_source)}
                        activeOpacity={0.7} // Optionnel: pour un feedback visuel au clic
                    >
                        <Ionicons name="arrow-redo" size={20} color={COLORS.accent} />
                        <Text style={styles.sourceText}>Source: {recette.url_source}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.cookingButton}
                    onPress={handleStartCooking}
                >
                    <Ionicons name="restaurant-outline" size={20} color={COLORS.background} />
                    <Text style={styles.cookingButtonText}>Mode Cuisine</Text>
                </TouchableOpacity>

                <View style={styles.secondaryActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleAddToShoppingList}
                    >
                        <Ionicons name="cart-outline" size={28} color={COLORS.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-social-outline" size={28} color={COLORS.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleEdit}
                    >
                        <Ionicons name="create-outline" size={28} color={COLORS.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleToggleFavori}
                    >
                        <Ionicons 
                            name={recette.est_favori ? "heart" : "heart-outline"} 
                            size={28} 
                            color={recette.est_favori ? "#dc7226ff" : COLORS.text} 
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleDelete}
                    >
                        <Ionicons name="trash-outline" size={28} color={COLORS.red} />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    titre: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    metaContainer: {
        gap: 6,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 15,
        color: COLORS.accent,
    },
    portionsSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: COLORS.beigeclair,
        borderRadius: 12,
    },
    portionsLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
        flexShrink: 0,
    },
    portionsControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,  
    },
    portionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.marron,
        justifyContent: 'center',
        alignItems: 'center',
    },
    portionButtonDisabled: {
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
    portionsValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        minWidth: 36,
        textAlign: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    tag: {
        backgroundColor: COLORS.white,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tagText: {
        fontSize: 13,
        color: COLORS.text,
    },
    notesSection: {
        padding: 20,
        backgroundColor: '#FFF9E6',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    notesSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    notesText: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    ingredientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
    ingredientText: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 24,
        flex: 1,
    },
    instructionItem: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    instructionText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 24,
    },
    sourceContainer: {
        backgroundColor: '#FFF9E6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 16,
    },
    sourceText: {
        fontSize: 13,
        color: COLORS.accent,
        fontStyle: 'italic',
        flex: 1,
    },
    actionsContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    cookingButton: {
        backgroundColor: COLORS.marron,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    cookingButtonText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: '600',
    },
    secondaryActions: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        gap: 16,
    },
    iconButton: {
        padding: 8,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.accent,
    },
});