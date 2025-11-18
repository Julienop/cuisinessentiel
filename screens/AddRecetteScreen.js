// screens/AddRecetteScreen.js

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import { CATEGORY_LABELS } from '../extractors/categoryDetector';
import premiumManager from '../utils/premiumManager';

export default function AddRecetteScreen({ navigation }) {
    const [titre, setTitre] = useState('');
    const [categorie, setCategorie] = useState('autre');
    const [tempsPreparation, setTempsPreparation] = useState('');
    const [tempsCuisson, setTempsCuisson] = useState('');
    const [nombrePortions, setNombrePortions] = useState('4');
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    const [tags, setTags] = useState('');
    const [notesPersonnelles, setNotesPersonnelles] = useState('');
    const [saving, setSaving] = useState(false);
    const [customTimers, setCustomTimers] = useState([]);
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [timerDuration, setTimerDuration] = useState('');
    const [timerStep, setTimerStep] = useState('1');
    const [timerLabel, setTimerLabel] = useState('');

    const handleAddTimer = () => {
        setShowTimerModal(true);
    };

    const handleSaveTimer = () => {
        const duration = parseInt(timerDuration);
        const stepIndex = parseInt(timerStep) - 1;
        
        if (isNaN(duration) || duration <= 0) {
            Alert.alert('Erreur', 'Veuillez entrer une durée valide');
            return;
        }
        
        if (isNaN(stepIndex) || stepIndex < 0) {
            Alert.alert('Erreur', 'Veuillez entrer un numéro d\'étape valide');
            return;
        }
        
        setCustomTimers([...customTimers, {
            duration,
            stepIndex,
            label: timerLabel.trim()
        }]);
        
        setTimerDuration('');
        setTimerStep('1');
        setTimerLabel('');
        setShowTimerModal(false);
    };

    const handleSave = async () => {
        // Vérifier la limite avant d'ajouter
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
                        onPress: () => {
                            // TODO: Ouvrir l'écran Premium
                            console.log('Redirection vers Premium à implémenter');
                        }
                    }
                ]
            );
            return;
        }

        // Validation basique
        if (!titre.trim()) {
            Alert.alert('Erreur', 'Veuillez saisir un titre');
            return;
        }
        if (!ingredients.trim()) {
            Alert.alert('Erreur', 'Veuillez saisir les ingrédients');
            return;
        }
        if (!instructions.trim()) {
            Alert.alert('Erreur', 'Veuillez saisir les instructions');
            return;
        }

        try {
            setSaving(true);

            // Parser les ingrédients (format simple: une ligne = un ingrédient)
            const ingredientsArray = ingredients
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    // Format simple: "250 g farine" ou "3 œufs"
                    const match = line.trim().match(/^(\d+(?:[.,]\d+)?)\s*(\w+)?\s+(.+)$/);
                    if (match) {
                        return {
                            quantite: match[1].replace(',', '.'),
                            unite: match[2] || '',
                            ingredient: match[3]
                        };
                    }
                    // Si pas de quantité détectée, tout va dans l'ingrédient
                    return {
                        quantite: '',
                        unite: '',
                        ingredient: line.trim()
                    };
                });

            // Parser les instructions (une ligne = une étape)
            const instructionsArray = instructions
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.trim());

            // Parser les tags (séparés par des virgules)
            const tagsArray = tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // Convertir les temps en nombres (ou null si vide)
            const prepTime = tempsPreparation.trim() ? parseInt(tempsPreparation) : null;
            const cookTime = tempsCuisson.trim() ? parseInt(tempsCuisson) : null;
            const portions = nombrePortions.trim() ? parseInt(nombrePortions) : 4;

            // Validation des temps
            if (tempsPreparation.trim() && (isNaN(prepTime) || prepTime <= 0)) {
                Alert.alert('Erreur', 'Le temps de préparation doit être un nombre positif');
                setSaving(false);
                return;
            }
            if (tempsCuisson.trim() && (isNaN(cookTime) || cookTime <= 0)) {
                Alert.alert('Erreur', 'Le temps de cuisson doit être un nombre positif');
                setSaving(false);
                return;
            }

            const recette = {
                titre: titre.trim(),
                categorie: categorie,
                ingredients: ingredientsArray,
                instructions: instructionsArray,
                url_source: null,
                temps_preparation: prepTime,
                temps_cuisson: cookTime,
                nombre_portions: portions,
                nombre_portions_original: portions,
                tags: tagsArray,
                est_favori: 0,
                notes_personnelles: notesPersonnelles.trim(),
                custom_timers: customTimers,
            };

            console.log('📝 Recette à sauvegarder:', JSON.stringify(recette, null, 2));

            await db.addRecette(recette);
            
            Alert.alert('Succès', 'Recette ajoutée avec succès', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error) {
            console.error('Erreur ajout recette:', error);
            Alert.alert('Erreur', 'Impossible d\'ajouter la recette');
        } finally {
            setSaving(false);
        }

        const handleAddTimer = () => {
            setShowTimerModal(true);
        };

        const handleSaveTimer = () => {
            const duration = parseInt(timerDuration);
            const stepIndex = parseInt(timerStep) - 1; // -1 car les indices commencent à 0
            
            if (isNaN(duration) || duration <= 0) {
                Alert.alert('Erreur', 'Veuillez entrer une durée valide');
                return;
            }
            
            if (isNaN(stepIndex) || stepIndex < 0) {
                Alert.alert('Erreur', 'Veuillez entrer un numéro d\'étape valide');
                return;
            }
            
            setCustomTimers([...customTimers, {
                duration,
                stepIndex,
                label: timerLabel.trim()
            }]);
            
            // Réinitialiser les champs
            setTimerDuration('');
            setTimerStep('1');
            setTimerLabel('');
            setShowTimerModal(false);
        };
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    {/* Titre */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Titre de la recette *</Text>
                        <TextInput
                            style={styles.input}
                            value={titre}
                            onChangeText={setTitre}
                            placeholder="Ex: Gâteau au chocolat"
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

                    {/* Temps de préparation et cuisson */}
                    <View style={styles.row}>
                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Temps de préparation</Text>
                            <Text style={styles.hint}>En minutes</Text>
                            <TextInput
                                style={styles.input}
                                value={tempsPreparation}
                                onChangeText={setTempsPreparation}
                                placeholder="Ex: 30"
                                placeholderTextColor={COLORS.accent}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Temps de cuisson</Text>
                            <Text style={styles.hint}>En minutes</Text>
                            <TextInput
                                style={styles.input}
                                value={tempsCuisson}
                                onChangeText={setTempsCuisson}
                                placeholder="Ex: 45"
                                placeholderTextColor={COLORS.accent}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Nombre de portions */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nombre de portions</Text>
                        <TextInput
                            style={styles.input}
                            value={nombrePortions}
                            onChangeText={setNombrePortions}
                            placeholder="Ex: 4"
                            placeholderTextColor={COLORS.accent}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Séparateur */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Timers personnalisés (optionnel)</Text>
                    </View>

                    {/* Liste des timers ajoutés */}
                    {customTimers.length > 0 && (
                        <View style={styles.timersList}>
                            {customTimers.map((timer, index) => (
                                <View key={index} style={styles.timerItem}>
                                    <View style={styles.timerInfo}>
                                        <Text style={styles.timerText}>
                                            ⏱️ {timer.duration} min - Étape {timer.stepIndex + 1}
                                        </Text>
                                        {timer.label && (
                                            <Text style={styles.timerLabel}>"{timer.label}"</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setCustomTimers(customTimers.filter((_, i) => i !== index));
                                        }}
                                    >
                                        <Text style={styles.removeTimerButton}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Bouton pour ajouter un timer */}
                    <TouchableOpacity
                        style={styles.addTimerButton}
                        onPress={() => {
                            // On va créer une fonction pour ça
                            handleAddTimer();
                        }}
                    >
                        <Text style={styles.addTimerButtonText}>+ Ajouter un timer</Text>
                    </TouchableOpacity>

                    {/* Séparateur */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ingrédients et préparation</Text>
                    </View>

                    {/* Ingrédients */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ingrédients * (un par ligne)</Text>
                        <Text style={styles.hint}>Format: quantité unité ingrédient</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={ingredients}
                            onChangeText={setIngredients}
                            placeholder={'250 g farine\n3 œufs\n100 ml lait'}
                            placeholderTextColor={COLORS.accent}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Instructions */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Instructions * (une étape par ligne)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder={'Préchauffer le four à 180°C\nMélanger les ingrédients\nEnfourner 30 minutes'}
                            placeholderTextColor={COLORS.accent}
                            multiline
                            numberOfLines={10}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Séparateur */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Informations complémentaires</Text>
                    </View>

                    {/* Tags */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tags (ou mots clés)</Text>
                        <Text style={styles.hint}>Séparez les tags par des virgules</Text>
                        <TextInput
                            style={styles.input}
                            value={tags}
                            onChangeText={setTags}
                            placeholder="Ex: rapide, végétarien, dessert"
                            placeholderTextColor={COLORS.accent}
                        />
                    </View>

                    {/* Notes personnelles */}
                    <View style={styles.formGroup}>
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
                </View>
            </ScrollView>

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
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal d'ajout de timer */}
            <Modal
                visible={showTimerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTimerModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>⏱️ Ajouter un timer</Text>
                        
                        <View style={styles.modalFormGroup}>
                            <Text style={styles.modalLabel}>Durée (en minutes)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={timerDuration}
                                onChangeText={setTimerDuration}
                                placeholder="Ex: 30"
                                placeholderTextColor={COLORS.accent}
                                keyboardType="numeric"
                            />
                        </View>
                        
                        <View style={styles.modalFormGroup}>
                            <Text style={styles.modalLabel}>Numéro de l'étape</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={timerStep}
                                onChangeText={setTimerStep}
                                placeholder="Ex: 3"
                                placeholderTextColor={COLORS.accent}
                                keyboardType="numeric"
                            />
                        </View>
                        
                        <View style={styles.modalFormGroup}>
                            <Text style={styles.modalLabel}>Label (optionnel)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={timerLabel}
                                onChangeText={setTimerLabel}
                                placeholder="Ex: Cuisson du gâteau"
                                placeholderTextColor={COLORS.accent}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setShowTimerModal(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonConfirm}
                                onPress={handleSaveTimer}
                            >
                                <Text style={styles.modalButtonConfirmText}>Ajouter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    scrollContent: {
        paddingBottom: 100, // Espace pour les boutons
    },
    form: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    sectionHeader: {
        marginTop: 8,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
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
    halfWidth: {
        flex: 1,
    },
    label: {
        fontSize: 16,
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
        padding: 12,
        fontSize: 16,
        color: COLORS.text,
    },
    textArea: {
        minHeight: 120,
        paddingTop: 12,
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
    saveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: COLORS.marron,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.background,
    },
    timersList: {
    gap: 8,
    marginBottom: 12,
    },
    timerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
    },
    timerInfo: {
        flex: 1,
    },
    timerText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    timerLabel: {
        fontSize: 13,
        color: COLORS.accent,
        fontStyle: 'italic',
        marginTop: 4,
    },
    removeTimerButton: {
        fontSize: 24,
        color: COLORS.marron,
        paddingHorizontal: 8,
    },
    addTimerButton: {
        backgroundColor: COLORS.beige,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    addTimerButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalFormGroup: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: COLORS.text,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButtonCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    modalButtonCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    modalButtonConfirm: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: COLORS.marron,
        alignItems: 'center',
    },
    modalButtonConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },
});