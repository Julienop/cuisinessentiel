// screens/HomeScreen.js
// Écran d'accueil de l'application

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { useFocusEffect } from '@react-navigation/native';
    import { COLORS } from '../constants/colors';
    import db from '../database/db';
    import { Ionicons } from '@expo/vector-icons';
    import { Alert } from 'react-native';
    import premiumManager, { LIMITE_RECETTES_GRATUIT } from '../utils/premiumManager';

    export default function HomeScreen({ navigation }) {
    const [stats, setStats] = useState({
        total: 0,
        favoris: 0,
        recentes: 0,
        courses: 0,
    });

    useFocusEffect(
        useCallback(() => {
        loadStats();
        }, [])
    );

    const loadStats = async () => {
        try {
        const total = await db.countRecettes();
        const recettesFavorites = await db.getAllRecettes('date_creation DESC', true);
        const recentes = await db.getRecentRecettesCount();
        const courses = await db.countShoppingItems();
        
        setStats({
            total,
            favoris: recettesFavorites.length,
            recentes,
            courses,
        });
        } catch (error) {
        console.error('Erreur chargement stats:', error);
        }
    };

    const handleImportURL = () => {
        navigation.navigate('ImportURL');
    };

    const handleAddRecette = () => {
        navigation.navigate('AddRecette');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
            <View style={styles.logoContainer}>
                <Image
                source={require('../assets/logo.png')}
                style={styles.bigLogo}
                resizeMode="contain"
                />
            {/* <Text style={styles.title}>Cuisin'essentiel</Text> */}
            <Text style={styles.subtitle}>Simple. Fiable. Hors ligne.</Text>
            </View>

            {/* Statistiques */}
            <View style={styles.statsContainer}>
            {/* Première ligne : Recettes et Favoris */}
            <View style={styles.statsRow}>
                <TouchableOpacity 
                style={styles.statBoxWrapper}
                onPress={() => navigation.navigate('RecetteList')}>
                <View style={styles.statBox}>
                    <Ionicons name="restaurant-outline" size={24} color={COLORS.marron} />
                    <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>{stats.total <= 1 ? 'recette' : 'recettes'}</Text>
                    </View>
                </View>
                </TouchableOpacity>

                <TouchableOpacity 
                style={styles.statBoxWrapper}
                onPress={() => navigation.navigate('RecetteList', { filter: 'favoris' })}>
                <View style={styles.statBox}>
                    <Ionicons name="heart-outline" size={24} color={COLORS.marron} />
                    <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.favoris}</Text>
                    <Text style={styles.statLabel}>{stats.favoris <= 1 ? 'favori' : 'favoris'}</Text>
                    </View>
                </View>
                </TouchableOpacity>
            </View>

            {/* Deuxième ligne : Récentes et Articles */}
            <View style={styles.statsRow}>
                <TouchableOpacity 
                style={styles.statBoxWrapper}
                onPress={() => navigation.navigate('RecetteList', { filter: 'recent' })}>
                <View style={styles.statBox}>
                    <Ionicons name="time-outline" size={24} color={COLORS.marron} />
                    <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.recentes}</Text>
                    <Text style={styles.statLabel}>{stats.recentes <= 1 ? 'récente' : 'récentes'}</Text>
                    </View>    
                </View>
                </TouchableOpacity>

                <TouchableOpacity 
                style={styles.statBoxWrapper}
                    onPress={() => {
                        const check = premiumManager.canAccessFeature('shopping_list');
                        if (!check.canAccess) {
                            Alert.alert(
                                'Premium requis',
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
                        navigation.navigate('ShoppingList');
                    }}
                >
                <View style={styles.statBox}>
                    <Ionicons name="cart-outline" size={24} color={COLORS.marron} />
                    <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.courses}</Text>
                    <Text style={styles.statLabel}>{stats.courses <= 1 ? 'article' : 'articles'}</Text>
                    </View>
                </View>
                </TouchableOpacity>
            </View>
            </View>

            {/* Indicateur de limite pour gratuits */}
            {!premiumManager.isPremium() && (
                <View style={styles.limitContainer}>
                    <View style={styles.limitContent}>
                        <View style={styles.limitTextContainer}>
                            <Text style={styles.limitLabel}>Version gratuite</Text>
                            <Text style={styles.limitCount}>
                                {stats.total} / {LIMITE_RECETTES_GRATUIT} recettes
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.upgradeSmallButton}
                            onPress={() => navigation.navigate('Premium')}
                        >
                            <Ionicons name="star" size={16} color="#FFD700" />
                            <Text style={styles.upgradeSmallText}>Premium</Text>
                        </TouchableOpacity>
                    </View>
                    {stats.total >= LIMITE_RECETTES_GRATUIT && (
                        <Text style={styles.limitWarning}>
                            ⚠️ Passez Premium pour ajouter plus de recettes
                        </Text>
                    )}
                </View>
            )}

            {/* Actions principales */}
            <View style={styles.actionsContainer}>
            <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('RecetteList')}
            >
                <Ionicons name="book-outline" size={24} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Toutes mes recettes</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleImportURL}
            >
                <Ionicons name="cloud-download-outline" size={24} color={COLORS.marron} />
                <Text style={styles.secondaryButtonText}>Importer une recette</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleAddRecette}
            >
                <Ionicons name="create-outline" size={24} color={COLORS.marron} />
                <Text style={styles.secondaryButtonText}>Créer une recette</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                    const check = premiumManager.canAccessFeature('shopping_list');
                    if (!check.canAccess) {
                        Alert.alert(
                            'Premium requis',
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
                    navigation.navigate('ShoppingList');
                }}
            >
                <Ionicons name="list-outline" size={24} color={COLORS.marron} />
                <Text style={styles.secondaryButtonText}>Liste de courses</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>

            {/* <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('ExportImport')}
                >
                <View style={styles.buttonContent}>
                    <Ionicons name="save-outline" size={20} color={COLORS.text} />
                    <Text style={styles.secondaryButtonText}>Sauvegarder mes recettes</Text>
                </View>
            </TouchableOpacity> */}

            </View>

            {/* Recettes récentes */}
            {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accès rapide</Text>
            
            // <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('RecetteList', { filter: 'favoris' })}
            >
                <Text style={styles.linkButtonText}>⭐ Mes favoris</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('RecetteList', { filter: 'recent' })}
            >
                <Text style={styles.linkButtonText}>🕐 Récemment ajoutées</Text>
            </TouchableOpacity>
            </View> */}

            {/* <View style={styles.footer}>
            <Text style={styles.footerText}>
                {stats.total} recettes
            </Text>
            </View> */}
        </ScrollView>
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
    header: {
        padding: 24,
        paddingTop: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.accent,
    },
    statsContainer: {
        paddingVertical: 12,
        marginHorizontal: 24,
        gap: 12,
    },
    statBox: {
        flexDirection: 'row',  // Horizontal au lieu de column
        alignItems: 'center',
        justifyContent: 'space-evenly',
        padding: 6,
        backgroundColor: COLORS.beigeclair,
        borderRadius: 8,
        gap: 12,  // Espace entre icône et contenu
    },
    statBoxWrapper: {
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statContent: {
        alignItems: 'center',  // Aligner à gauche
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        lineHeight: 28,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.accent,
        marginTop: 0,  // Pas de marge
    },
    actionsContainer: {
        paddingHorizontal: 24,
        paddingTop: 6,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: COLORS.marron,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    primaryButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: COLORS.beige,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    section: {
        padding: 24,
        paddingTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    linkButton: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    linkButtonText: {
        fontSize: 16,
        color: COLORS.text,
    },
    footer: {
        padding: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: COLORS.accent,
    },
    logoContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 8,
    },
    bigLogo: {
        width: 200,
        height: 200,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    limitContainer: {
        marginHorizontal: 24,
        marginTop: 0,
        marginBottom: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.beigeclair,
        borderRadius: 8,
    },
    limitContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    limitTextContainer: {
        flex: 1,
    },
    limitLabel: {
        fontSize: 12,
        color: COLORS.accent,
        fontWeight: '500',
        marginBottom: 4,
    },
    limitCount: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.accent,
    },
    upgradeSmallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.marron,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    upgradeSmallText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.background,
    },
    limitWarning: {
        fontSize: 14,
        color: '#D97706',
        marginTop: 6,
        fontWeight: '500',
    },
});