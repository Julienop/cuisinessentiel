// screens/RecetteEditScreen.js
// Écran d'édition d'une recette existante

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import { CATEGORY_LABELS } from '../extractors/categoryDetector';
import { Ionicons } from '@expo/vector-icons';

export default function RecetteEditScreen({ navigation, route }) {
    const { recetteId } = route.params;
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // États pour les champs
    const [titre, setTitre] = useState('');
    const [categorie, setCategorie] = useState('autre');
    const [tempsPreparation, setTempsPreparation] = useState('');
    const [tempsCuisson, setTempsCuisson] = useState('');
    const [nombrePortions, setNombrePortions] = useState('');
    const [ingredients, setIngredients] = useState([]);
    const [instructions, setInstructions] = useState([]);
    const [tags, setTags] = useState('');
    const [notesPersonnelles, setNotesPersonnelles] = useState('');
    const [urlSource, setUrlSource] = useState('');

    useEffect(() => {
        loadRecette();
    }, []);

    const loadRecette = async () => {
        try {
            const data = await db.getRecetteById(recetteId);
            if (!data) {
                Alert.alert('Erreur', 'Recette introuvable');
                navigation.goBack();
                return;
            }

            // Charger les données
            setTitre(data.titre);
            setCategorie(data.categorie || 'autre');
            setTempsPreparation(data.temps_preparation?.toString() || '');
            setTempsCuisson(data.temps_cuisson?.toString() || '');
            setNombrePortions(data.nombre_portions?.toString() || '');
            setIngredients(data.ingredients || []);
            setInstructions(data.instructions || []);
            setTags(data.tags?.join(', ') || '');
            setNotesPersonnelles(data.notes_personnelles || '');
            setUrlSource(data.url_source || '');
        } catch (error) {
            console.error('Erreur chargement recette:', error);
            Alert.alert('Erreur', 'Impossible de charger la recette');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!titre.trim()) {
            Alert.alert('Erreur', 'Le titre est obligatoire');
            return;
        }

        if (ingredients.length === 0) {
            Alert.alert('Erreur', 'Ajoutez au moins un ingrédient');
            return;
        }

        if (instructions.length === 0) {
            Alert.alert('Erreur', 'Ajoutez au moins une étape');
            return;
        }

        try {
            setSaving(true);

            const recetteData = {
                titre: titre.trim(),
                categorie,
                temps_preparation: tempsPreparation ? parseInt(tempsPreparation) : null,
                temps_cuisson: tempsCuisson ? parseInt(tempsCuisson) : null,
                nombre_portions: nombrePortions ? parseInt(nombrePortions) : 4,
                ingredients,
                instructions,
                tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
                notes_personnelles: notesPersonnelles.trim(),
                url_source: urlSource,
                est_favori: 0, // On garde le statut actuel
            };

            await db.updateRecette(recetteId, recetteData);
            
            Alert.alert('Succès', 'Recette mise à jour !', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder la recette');
        } finally {
            setSaving(false);
        }
    };

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { quantite: '', unite: '', ingredient: '' }]);
    };

    const handleUpdateIngredient = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const handleRemoveIngredient = (index) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleAddInstruction = () => {
        setInstructions([...instructions, '']);
    };

    const handleUpdateInstruction = (index, value) => {
        const newInstructions = [...instructions];
        newInstructions[index] = value;
        setInstructions(newInstructions);
    };

    const handleRemoveInstruction = (index) => {
        setInstructions(instructions.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.text} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollViewContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Titre */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Titre *</Text>
                        <TextInput
                            style={styles.input}
                            value={titre}
                            onChangeText={setTitre}
                            placeholder="Nom de la recette"
                            placeholderTextColor={COLORS.accent}
                        />
                    </View>

                    {/* Catégorie */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Catégorie</Text>
                        <View style={styles.categoriesContainer}>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.categoryButton,
                                        categorie === key && styles.categoryButtonActive
                                    ]}
                                    onPress={() => setCategorie(key)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        categorie === key && styles.categoryTextActive
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Temps et portions */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Informations</Text>
                        <View style={styles.row}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Préparation (min)</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    value={tempsPreparation}
                                    onChangeText={setTempsPreparation}
                                    keyboardType="numeric"
                                    placeholder="15"
                                    placeholderTextColor={COLORS.accent}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Cuisson (min)</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    value={tempsCuisson}
                                    onChangeText={setTempsCuisson}
                                    keyboardType="numeric"
                                    placeholder="30"
                                    placeholderTextColor={COLORS.accent}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Portions</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    value={nombrePortions}
                                    onChangeText={setNombrePortions}
                                    keyboardType="numeric"
                                    placeholder="4"
                                    placeholderTextColor={COLORS.accent}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Ingrédients */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.label}>Ingrédients *</Text>
                            <TouchableOpacity onPress={handleAddIngredient}>
                                <Text style={styles.addButton}>+ Ajouter</Text>
                            </TouchableOpacity>
                        </View>
                        {ingredients.map((ing, index) => (
                            <View key={index} style={styles.ingredientRow}>
                                <TextInput
                                    style={[styles.input, styles.ingredientInput]}
                                    value={ing.quantite}
                                    onChangeText={(text) => handleUpdateIngredient(index, 'quantite', text)}
                                    placeholder="250"
                                    placeholderTextColor={COLORS.accent}
                                />
                                <TextInput
                                    style={[styles.input, styles.uniteInput]}
                                    value={ing.unite}
                                    onChangeText={(text) => handleUpdateIngredient(index, 'unite', text)}
                                    placeholder="g"
                                    placeholderTextColor={COLORS.accent}
                                />
                                <TextInput
                                    style={[styles.input, styles.ingredientNameInput]}
                                    value={ing.ingredient}
                                    onChangeText={(text) => handleUpdateIngredient(index, 'ingredient', text)}
                                    placeholder="farine"
                                    placeholderTextColor={COLORS.accent}
                                />
                                <TouchableOpacity onPress={() => handleRemoveIngredient(index)}>
                                    <Ionicons name="trash-outline" size={20} color={COLORS.marron} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* Instructions */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.label}>Instructions *</Text>
                            <TouchableOpacity onPress={handleAddInstruction}>
                                <Text style={styles.addButton}>+ Ajouter</Text>
                            </TouchableOpacity>
                        </View>
                        {instructions.map((instruction, index) => (
                            <View key={index} style={styles.instructionRow}>
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                                <TextInput
                                    style={[styles.input, styles.instructionInput]}
                                    value={instruction}
                                    onChangeText={(text) => handleUpdateInstruction(index, text)}
                                    placeholder="Étape de préparation"
                                    placeholderTextColor={COLORS.accent}
                                    multiline
                                />
                                <TouchableOpacity onPress={() => handleRemoveInstruction(index)}>
                                    <Ionicons name="trash-outline" size={20} color={COLORS.marron} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* Tags */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Tags (ou mots clés)</Text>
                        <Text style={styles.hint}>Séparez les tags par des virgules</Text>
                        <TextInput
                            style={styles.input}
                            value={tags}
                            onChangeText={setTags}
                            placeholder="facile, végétarien, été"
                            placeholderTextColor={COLORS.accent}
                        />
                    </View>

                    {/* 📝 NOUVEAU : Notes personnelles */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Notes personnelles</Text>
                        <Text style={styles.hint}>Vos astuces, modifications, remarques...</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={notesPersonnelles}
                            onChangeText={setNotesPersonnelles}
                            placeholder="Ex: Doubler le sel, cuire 5 min de plus..."
                            placeholderTextColor={COLORS.accent}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>

                {/* Boutons d'action */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <Text style={styles.saveButtonText}>Enregistrer</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 100, // Espace pour les boutons
    },
    section: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    hint: {
        fontSize: 13,
        color: COLORS.accent,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 6,
        fontSize: 16,
        color: COLORS.text,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        // borderWidth: 1,
        // borderColor: COLORS.beige,
        backgroundColor: COLORS.beigeclair,
    },
    categoryButtonActive: {
        backgroundColor: COLORS.marron,
        borderColor: COLORS.marron,
    },
    categoryText: {
        fontSize: 14,
        color: COLORS.text,
    },
    categoryTextActive: {
        color: COLORS.background,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        color: COLORS.accent,
        marginBottom: 4,
    },
    smallInput: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 8,
        fontSize: 16,
        color: COLORS.text,
    },
    addButton: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    ingredientRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
        alignItems: 'center',
    },
    ingredientInput: {
        flex: 2,
    },
    uniteInput: {
        flex: 1,
    },
    ingredientNameInput: {
        flex: 3,
    },
    removeButton: {
        fontSize: 20,
        padding: 4,
    },
    instructionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    stepNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        paddingTop: 12,
    },
    instructionInput: {
        flex: 1,
        minHeight: 60,
        textAlignVertical: 'top',
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
        paddingVertical: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.beige,
        backgroundColor: COLORS.beige,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    saveButton: {
        flex: 1,
        backgroundColor: COLORS.marron,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    hint: {
        fontSize: 13,
        color: COLORS.accent,
        marginBottom: 8,
        fontStyle: 'italic',
    },
});