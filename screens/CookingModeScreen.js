// screens/CookingModeScreen.js
// Mode cuisine plein écran avec timers intelligents

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    Vibration,
    Alert,
    AppState,
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
    import { Audio } from 'expo-av';
    import { COLORS } from '../constants/colors';
    import db from '../database/db';
    import { detectAllDurations, formatDuration, formatRemainingTime } from '../utils/timeParser';
    import { Ionicons } from '@expo/vector-icons';

    export default function CookingModeScreen({ navigation, route }) {
    const { recetteId, selectedPortions, adjustedIngredients } = route.params;
    
    const [recette, setRecette] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeStep, setActiveStep] = useState(0);
    
    // États pour les timers
    const [timers, setTimers] = useState([]); // [{id, stepIndex, initialMinutes, remainingSeconds, isRunning, startTime}]
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState('');
    const [timerStepIndex, setTimerStepIndex] = useState(null);
    
    const intervalRefs = useRef({});
    const appState = useRef(AppState.currentState);
    const soundRef = useRef(null);

    useEffect(() => {
        // ✅ ACTIVER le keep awake uniquement pour ce screen
        activateKeepAwakeAsync();

        // Configurer l'audio
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
        });
        
        loadRecette();
        
        // Écouter les changements d'état de l'app (background/foreground)
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        // Cleanup des timers à la sortie
        return () => {
            // ✅ DÉSACTIVER le keep awake quand on quitte
            deactivateKeepAwake();
            
            Object.values(intervalRefs.current).forEach(clearInterval);
            subscription.remove();
            
            // Nettoyer le son
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, [recetteId]);

    const handleAppStateChange = (nextAppState) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // L'app revient au foreground, recalculer les timers
        recalculateTimers();
        }
        appState.current = nextAppState;
    };

    const recalculateTimers = () => {
        setTimers(prev => prev.map(timer => {
        if (!timer.isRunning || !timer.startTime) return timer;
        
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - timer.startTime) / 1000);
        const newRemainingSeconds = Math.max(0, timer.initialMinutes * 60 - elapsedSeconds);
        
        if (newRemainingSeconds === 0) {
            // Le timer est terminé pendant qu'on était en background
            clearInterval(intervalRefs.current[timer.id]);
            handleTimerFinished(timer.id);
        }
        
        return {
            ...timer,
            remainingSeconds: newRemainingSeconds
        };
        }));
    };

    const loadRecette = async () => {
        try {
            const data = await db.getRecetteById(recetteId);
            
            // Si des ingrédients ajustés sont fournis, les utiliser
            if (adjustedIngredients && adjustedIngredients.length > 0) {
                setRecette({
                    ...data,
                    ingredients: adjustedIngredients,
                    nombre_portions: selectedPortions || data.nombre_portions
                });
            } else {
                setRecette(data);
            }
        } catch (error) {
            console.error('Erreur chargement recette:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Demander confirmation si des timers sont actifs
        const activeTimers = timers.filter(t => t.isRunning);
        if (activeTimers.length > 0) {
        Alert.alert(
            'Timers en cours',
            'Des timers sont encore actifs. Voulez-vous vraiment quitter ?',
            [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Quitter', style: 'destructive', onPress: () => navigation.goBack() }
            ]
        );
        } else {
        navigation.goBack();
        }
    };

    const handleNextStep = () => {
        if (recette && activeStep < recette.instructions.length - 1) {
        setActiveStep(activeStep + 1);
        }
    };

    const handlePreviousStep = () => {
        if (activeStep > 0) {
        setActiveStep(activeStep - 1);
        }
    };

    // Gestion des timers
    const handleOpenTimerModal = (stepIndex, detectedMinutes) => {
        setTimerStepIndex(stepIndex);
        setTimerMinutes(detectedMinutes ? detectedMinutes.toString() : '');
        setShowTimerModal(true);
    };

    const handleStartTimer = () => {
        const minutes = parseInt(timerMinutes);
        if (isNaN(minutes) || minutes <= 0) {
        Alert.alert('Erreur', 'Veuillez entrer une durée valide');
        return;
        }

        const newTimer = {
        id: Date.now(),
        stepIndex: timerStepIndex,
        initialMinutes: minutes,
        remainingSeconds: minutes * 60,
        isRunning: true,
        startTime: Date.now(), // Timestamp de démarrage
        };

        setTimers([...timers, newTimer]);
        startTimerInterval(newTimer.id);
        setShowTimerModal(false);
        setTimerMinutes('');
    };

    const startTimerInterval = (timerId) => {
        intervalRefs.current[timerId] = setInterval(() => {
            setTimers(prev => prev.map(t => {
                if (t.id !== timerId || !t.isRunning) return t;
                
                // Calculer le temps écoulé depuis le démarrage
                const elapsedSeconds = Math.floor((Date.now() - t.startTime) / 1000);
                const newRemaining = Math.max(0, t.initialMinutes * 60 - elapsedSeconds);
                
                // Timer terminé ?
                if (newRemaining === 0 && t.remainingSeconds > 0) {
                    clearInterval(intervalRefs.current[timerId]);
                    handleTimerFinished(timerId);
                }
                
                return { ...t, remainingSeconds: newRemaining };
            }));
        }, 1000);
    };

    const handleTimerFinished = async (timerId) => {
        // Jouer le son d'alarme
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/timer-alarm.mp3'),
                { 
                    shouldPlay: true, 
                    volume: 1.0,
                    isLooping: true  // Répéter en boucle
                }
            );
            soundRef.current = sound;
            
            // Supprimer automatiquement le timer après 10 secondes (si pas déjà supprimé)
            setTimeout(() => {
                if (soundRef.current) {
                    soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
                removeTimer(timerId);
            }, 10000);
        } catch (error) {
            console.log('Erreur lecture son:', error);
        }
        
        // Vibration longue et répétée
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
        
        // Le timer reste visible à 00:00 pour permettre l'arrêt manuel
    };

    const pauseTimer = (timerId) => {
        clearInterval(intervalRefs.current[timerId]);
        setTimers(prev => prev.map(t => 
        t.id === timerId ? { ...t, isRunning: false } : t
        ));
    };

    const resumeTimer = (timerId) => {
        const timer = timers.find(t => t.id === timerId);
        if (timer) {
        // Recalculer le startTime en fonction du temps restant
        const newStartTime = Date.now() - ((timer.initialMinutes * 60 - timer.remainingSeconds) * 1000);
        
        setTimers(prev => prev.map(t => 
            t.id === timerId ? { ...t, isRunning: true, startTime: newStartTime } : t
        ));
        
        startTimerInterval(timerId);
        }
    };

    const removeTimer = (timerId) => {
        clearInterval(intervalRefs.current[timerId]);
        delete intervalRefs.current[timerId];
        setTimers(prev => prev.filter(t => t.id !== timerId));
        
        // Arrêter le son si en cours de lecture
        if (soundRef.current) {
            soundRef.current.unloadAsync();
            soundRef.current = null;
        }
    };

    // Détection automatique de durée pour l'étape active
    const getDetectedDurations = (instruction) => {
        return detectAllDurations(instruction);
    };

    if (loading) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.text} />
        </View>
        );
    }

    if (!recette) {
        return (
        <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Recette introuvable</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
        </View>
        );
    }

    const detectedDurations = getDetectedDurations(recette.instructions[activeStep]);
    const activeTimersForStep = timers.filter(t => t.stepIndex === activeStep);

    return (
        <SafeAreaView style={styles.container}>
        {/* Header fixe avec badge timers */}
        <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeIconButton}>
            <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
            {recette.titre}
            </Text>
            
            {/* Badge timers actifs */}
            {timers.length > 0 && (
            <View style={styles.timersBadgeContainer}>
                {timers.map(timer => (
                <TouchableOpacity
                    key={timer.id}
                    style={[styles.timerBadge, !timer.isRunning && styles.timerBadgePaused]}
                    onPress={() => timer.isRunning ? pauseTimer(timer.id) : resumeTimer(timer.id)}
                    onLongPress={() => removeTimer(timer.id)}
                >
                    <Text style={styles.timerBadgeText}>
                    {formatRemainingTime(timer.remainingSeconds)}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
            )}
            {timers.length === 0 && <View style={styles.placeholder} />}
        </View>

        <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Ingrédients - Toujours visibles */}
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            <View style={styles.ingredientsList}>
                {recette.ingredients.map((item, index) => (
                <View key={index} style={styles.ingredientRow}>
                    <Text style={styles.ingredientBullet}>•</Text>
                    <Text style={styles.ingredientText}>
                    <Text style={styles.ingredientQuantity}>
                        {item.quantite} {item.unite}
                    </Text>
                    {' '}
                    {item.ingredient}
                    </Text>
                </View>
                ))}
            </View>
            </View>

            {/* Séparateur */}
            <View style={styles.separator} />

            {/* Instructions - Navigation par étape */}
            <View style={styles.section}>
            <View style={styles.stepHeader}>
                <Text style={styles.sectionTitle}>Préparation</Text>
                <Text style={styles.stepCounter}>
                Étape {activeStep + 1} / {recette.instructions.length}
                </Text>
            </View>

            <View style={styles.stepContainer}>
                <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{activeStep + 1}</Text>
                </View>
                
                <Text style={styles.stepInstruction}>
                {recette.instructions[activeStep]}
                </Text>

                {/* Boutons timer contextuels */}
                {(detectedDurations.length > 0 || (recette.custom_timers && recette.custom_timers.filter(t => t.stepIndex === activeStep).length > 0)) && (
                <View style={styles.timerButtonsContainer}>
                    {/* Timers détectés automatiquement */}
                    {detectedDurations.map((duration, index) => (
                        <TouchableOpacity
                            key={`auto-${index}`}
                            style={styles.timerButton}
                            onPress={() => handleOpenTimerModal(activeStep, duration.duration)}
                        >
                            <Ionicons name="timer-outline" size={24} color={COLORS.marron} />
                            <Text style={styles.timerButtonText}>
                                Démarrer {duration.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    
                    {/* Timers personnalisés pour cette étape */}
                    {recette.custom_timers && recette.custom_timers
                        .filter(timer => timer.stepIndex === activeStep)
                        .map((timer, index) => (
                            <TouchableOpacity
                                key={`custom-${index}`}
                                style={[styles.timerButton, styles.customTimerButton]}
                                onPress={() => handleOpenTimerModal(activeStep, timer.duration)}
                            >
                                <Ionicons name="timer-outline" size={24} color={COLORS.marron} />
                                <Text style={styles.timerButtonText}>
                                    Démarrer {timer.label || `Timer ${timer.duration} min`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                </View>
                )}

                {/* Timers actifs pour cette étape */}
                {activeTimersForStep.map(timer => (
                <View key={timer.id} style={styles.activeTimerCard}>
                    <Text style={styles.activeTimerTime}>
                    {formatRemainingTime(timer.remainingSeconds)}
                    </Text>
                    <View style={styles.activeTimerControls}>
                    <TouchableOpacity
                        style={styles.timerControlButton}
                        onPress={() => timer.isRunning ? pauseTimer(timer.id) : resumeTimer(timer.id)}
                    >
                        <Ionicons 
                            name={timer.isRunning ? "pause" : "play"}
                            size={20} 
                            color={COLORS.beigeclair} 
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.timerControlButton}
                        onPress={() => removeTimer(timer.id)}
                    >
                        <Ionicons name="trash" size={20} color={COLORS.beigeclair} />
                    </TouchableOpacity>
                    </View>
                </View>
                ))}
            </View>

            {/* Navigation entre étapes */}
            <View style={styles.navigationButtons}>
                <TouchableOpacity
                style={[styles.navButton, activeStep === 0 && styles.navButtonDisabled]}
                onPress={handlePreviousStep}
                disabled={activeStep === 0}
                >
                <Text style={styles.navButtonText}>← Précédent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={[
                    styles.navButton,
                    activeStep === recette.instructions.length - 1 && styles.navButtonDisabled
                ]}
                onPress={handleNextStep}
                disabled={activeStep === recette.instructions.length - 1}
                >
                <Text style={styles.navButtonText}>Suivant →</Text>
                </TouchableOpacity>
            </View>

            {/* Toutes les étapes (aperçu) */}
            <View style={styles.allStepsPreview}>
                <Text style={styles.previewTitle}>Toutes les étapes :</Text>
                {recette.instructions.map((instruction, index) => {
                const hasTimer = timers.some(t => t.stepIndex === index);
                return (
                    <TouchableOpacity
                    key={index}
                    style={[
                        styles.previewStep,
                        index === activeStep && styles.previewStepActive
                    ]}
                    onPress={() => setActiveStep(index)}
                    >
                    <Text style={[
                        styles.previewStepNumber,
                        index === activeStep && styles.previewStepNumberActive
                    ]}>
                        {index + 1}
                    </Text>
                    <Text style={[
                        styles.previewStepText,
                        index === activeStep && styles.previewStepTextActive
                    ]} numberOfLines={2}>
                        {instruction}
                    </Text>
                    {hasTimer && <Text style={styles.previewStepTimer}>⏱️</Text>}
                    </TouchableOpacity>
                );
                })}
            </View>
            </View>
        </ScrollView>

        {/* Footer avec temps */}
        {(recette.temps_preparation || recette.temps_cuisson) && (
            <View style={styles.footer}>
                {recette.temps_preparation && (
                    <View style={styles.footerItem}>
                        <Ionicons name="timer-outline" size={20} color={COLORS.marron} />
                        <Text style={styles.footerText}>
                            Préparation: {recette.temps_preparation} min
                        </Text>
                    </View>
                )}
                {recette.temps_cuisson && (
                    <View style={styles.footerItem}>
                        <Ionicons name="flame" size={20} color={COLORS.iconfire} />
                        <Text style={styles.footerText}>
                            Cuisson: {recette.temps_cuisson} min
                        </Text>
                    </View>
                )}
            </View>
        )}

        {/* Modal de configuration du timer */}
        <Modal
            visible={showTimerModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowTimerModal(false)}
        >
            <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Configurer le timer</Text>
                
                <Text style={styles.modalLabel}>Durée (en minutes)</Text>
                <TextInput
                style={styles.modalInput}
                value={timerMinutes}
                onChangeText={setTimerMinutes}
                keyboardType="numeric"
                placeholder="Ex: 20"
                placeholderTextColor="#999"
                autoFocus
                />

                <View style={styles.modalButtons}>
                <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={() => setShowTimerModal(false)}
                >
                    <Text style={styles.modalButtonCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.modalButtonConfirm}
                    onPress={handleStartTimer}
                >
                    <Text style={styles.modalButtonConfirmText}>Démarrer</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.background,
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
    },
    closeIconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        fontSize: 28,
        color: '#000000',
        fontWeight: '600',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    placeholder: {
        width: 40,
    },
    timersBadgeContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    timerBadge: {
        backgroundColor: '#000000',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        minWidth: 70,
        alignItems: 'center',
    },
    timerBadgePaused: {
        backgroundColor: '#666666',
    },
    timerBadgeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 20,
    },
    ingredientsList: {
        gap: 12,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    ingredientBullet: {
        fontSize: 24,
        color: '#000000',
        marginRight: 12,
        lineHeight: 32,
    },
    ingredientText: {
        flex: 1,
        fontSize: 22,
        color: '#000000',
        lineHeight: 32,
    },
    ingredientQuantity: {
        fontWeight: '700',
    },
    separator: {
        height: 2,
        backgroundColor: '#000000',
        marginVertical: 24,
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    stepCounter: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666666',
    },
    stepContainer: {
        marginBottom: 32,
    },
    stepNumberBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.marron,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    stepNumberText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    stepInstruction: {
        fontSize: 24,
        lineHeight: 36,
        color: '#000000',
        fontWeight: '500',
        marginBottom: 20,
    },
    timerButtonsContainer: {
        gap: 12,
        marginBottom: 16,
    },
    timerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.beige,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
    },
    timerButtonIcon: {
        fontSize: 24,
    },
    timerButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    activeTimerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: COLORS.marron,
    },
    activeTimerTime: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    activeTimerControls: {
        flexDirection: 'row',
        gap: 12,
    },
    timerControlButton: {
        width: 48,
        height: 48,
        backgroundColor: COLORS.marron,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerControlIcon: {
        fontSize: 20,
    },
    navigationButtons: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    navButton: {
        flex: 1,
        paddingVertical: 16,
        backgroundColor: COLORS.beige,
        borderRadius: 12,
        alignItems: 'center',
    },
    navButtonDisabled: {
        backgroundColor: COLORS.beige,
    },
    navButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    allStepsPreview: {
        marginTop: 16,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666666',
        marginBottom: 12,
    },
    previewStep: {
        flexDirection: 'row',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
    },
    previewStepActive: {
        backgroundColor: COLORS.marron,
        borderColor: COLORS.marron,
    },
    previewStepNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#666666',
        marginRight: 12,
        minWidth: 24,
    },
    previewStepNumberActive: {
        color: '#FFFFFF',
    },
    previewStepText: {
        flex: 1,
        fontSize: 16,
        color: '#666666',
        lineHeight: 22,
    },
    previewStepTextActive: {
        color: '#FFFFFF',
    },
    previewStepTimer: {
        fontSize: 16,
        marginLeft: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: COLORS.background,
        borderTopWidth: 2,
        borderTopColor: '#000000',
    },
    footerItem: {  // AJOUTE ce nouveau style
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    errorText: {
        fontSize: 18,
        color: '#666666',
        marginBottom: 20,
    },
    closeButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: COLORS.marron,
        borderRadius: 8,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.marron,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: COLORS.background,
        borderWidth: 2,
        borderColor: '#000000',
        borderRadius: 8,
        padding: 16,
        fontSize: 18,
        color: '#000000',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButtonCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: COLORS.beige,
        alignItems: 'center',
    },
    modalButtonCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    modalButtonConfirm: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: COLORS.marron,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});