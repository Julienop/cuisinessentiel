// screens/RecetteListScreen.js
// Écran d'affichage de la liste des recettes groupées par catégories

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from '../extractors/categoryDetector';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { exportSelectedRecettes } from '../utils/exportImportManager';

export default function RecetteListScreen({ navigation, route }) {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActive, setFilterActive] = useState(route.params?.filter || 'all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedRecettes, setSelectedRecettes] = useState([]);
    const isFirstLoad = useRef(true);

    useFocusEffect(
        useCallback(() => {
            const shouldShowFullLoading = isFirstLoad.current;
            if (isFirstLoad.current) {
                isFirstLoad.current = false;
            }
            loadRecettes(shouldShowFullLoading);
        }, [filterActive, categoryFilter])
    );

    const loadRecettes = async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }
            
            if (searchQuery.trim().length > 0) {
                const results = await db.searchRecettes(searchQuery);
                setSections(convertToSections({ 'Résultats': results }));
            } else {
                const grouped = await db.getRecettesGroupedByCategory(filterActive === 'favoris');
                
                if (categoryFilter !== 'all') {
                    const filtered = {};
                    filtered[categoryFilter] = grouped[categoryFilter] || [];
                    setSections(convertToSections(filtered));
                } else {
                    setSections(convertToSections(grouped));
                }
            }
        } catch (error) {
            console.error('Erreur chargement recettes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const convertToSections = (grouped) => {
        const sections = [];
        const categoriesOrder = ['entrée', 'plat', 'dessert', 'snack', 'boisson', 'autre'];
        
        categoriesOrder.forEach(categoryKey => {
            const recettes = grouped[categoryKey];
            if (recettes && recettes.length > 0) {
                sections.push({
                    title: `${CATEGORY_LABELS[categoryKey]}`,
                    data: recettes
                });
            }
        });
        
        return sections;
    };

    const handleSearch = async (text) => {
        setSearchQuery(text);
        
        if (text.trim().length === 0) {
            try {
                setRefreshing(true);
                const grouped = await db.getRecettesGroupedByCategory(filterActive === 'favoris');
                
                if (categoryFilter !== 'all') {
                    const filtered = {};
                    filtered[categoryFilter] = grouped[categoryFilter] || [];
                    setSections(convertToSections(filtered));
                } else {
                    setSections(convertToSections(grouped));
                }
            } catch (error) {
                console.error('Erreur chargement recettes:', error);
            } finally {
                setRefreshing(false);
            }
            return;
        }
        
        setCategoryFilter('all');
        
        try {
            setRefreshing(true);
            const results = await db.searchRecettes(text);
            if (results.length > 0) {
                setSections([{ title: 'Résultats', data: results }]);
            } else {
                setSections([]);
            }
        } catch (error) {
            console.error('Erreur recherche:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleToggleFavori = async (recetteId, event) => {
        event?.stopPropagation();
        
        try {
            await db.toggleFavori(recetteId);
            
            // Mise à jour optimiste : on met à jour directement l'état local
            setSections(prevSections => 
                prevSections.map(section => ({
                    ...section,
                    data: section.data.map(item => 
                        item.id === recetteId 
                            ? { ...item, est_favori: item.est_favori === 1 ? 0 : 1 }
                            : item
                    )
                }))
            );
        } catch (error) {
            console.error('Erreur toggle favori:', error);
        }
    };

    const handleLongPress = (recetteId) => {
        if (!selectionMode) {
            setSelectionMode(true);
            setSelectedRecettes([recetteId]);
        }
    };

    const handleSelectRecette = (recetteId) => {
        if (selectedRecettes.includes(recetteId)) {
            const newSelection = selectedRecettes.filter(id => id !== recetteId);
            setSelectedRecettes(newSelection);
            
            // Si plus aucune sélection, sortir du mode sélection
            if (newSelection.length === 0) {
                setSelectionMode(false);
            }
        } else {
            setSelectedRecettes([...selectedRecettes, recetteId]);
        }
    };

    const handleSelectAll = () => {
        const allIds = sections.flatMap(section => section.data.map(item => item.id));
        if (selectedRecettes.length === allIds.length) {
            setSelectedRecettes([]);
            setSelectionMode(false);
        } else {
            setSelectedRecettes(allIds);
        }
    };

    const handleCancelSelection = () => {
        setSelectionMode(false);
        setSelectedRecettes([]);
    };

    const handleShareSelected = async () => {
        if (selectedRecettes.length === 0) {
            Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
            return;
        }

        const result = await exportSelectedRecettes(selectedRecettes);
        
        if (!result.success) {
            if (result.isPremiumRequired) {
                Alert.alert(
                    'Premium requis',
                    result.error,
                    [
                        { text: 'Plus tard' },
                        { 
                            text: 'Passer Premium',
                            onPress: () => navigation.navigate('Premium')
                        }
                    ]
                );
            } else {
                Alert.alert('Erreur', result.error);
            }
            return;
        }
        
        setSelectionMode(false);
        setSelectedRecettes([]);
    };

    const handleDeleteSelected = () => {
        if (selectedRecettes.length === 0) {
            Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
            return;
        }

        Alert.alert(
            'Supprimer les recettes',
            `Êtes-vous sûr de vouloir supprimer ${selectedRecettes.length} recette${selectedRecettes.length > 1 ? 's' : ''} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.deleteRecettes(selectedRecettes);
                            setSelectionMode(false);
                            setSelectedRecettes([]);
                            await loadRecettes(false);
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de supprimer les recettes');
                        }
                    },
                },
            ]
        );
    };

    const renderRecetteItem = ({ item }) => {
        const isSelected = selectedRecettes.includes(item.id);
        
        return (
            <TouchableOpacity
                style={[
                    styles.recetteCard,
                    isSelected && styles.recetteCardSelected
                ]}
                onPress={() => {
                    if (selectionMode) {
                        handleSelectRecette(item.id);
                    } else {
                        navigation.navigate('RecetteDetail', { recetteId: item.id });
                    }
                }}
                onLongPress={() => handleLongPress(item.id)}
                delayLongPress={500}
            >
                {/* Checkbox en mode sélection */}
                {selectionMode && (
                    <View style={styles.checkbox}>
                        <View style={[
                            styles.checkboxInner,
                            isSelected && styles.checkboxInnerSelected
                        ]}>
                            {isSelected && (
                                <Ionicons name="checkmark" size={18} color={COLORS.beige} />
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.recetteContent}>
                    <View style={styles.recetteHeader}>
                        <Text style={styles.recetteTitre} numberOfLines={2}>
                            {item.titre}
                        </Text>
                        
                        {/* Bouton favori avec coeur */}
                        {!selectionMode && (
                            <TouchableOpacity
                                onPress={(e) => handleToggleFavori(item.id, e)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons 
                                    name={item.est_favori === 1 ? "heart" : "heart-outline"}
                                    size={24}
                                    color={item.est_favori === 1 ? "#dc7226ff" : COLORS.accent}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.recetteMeta}>
                        {item.temps_preparation && (
                            <View style={styles.metaItem}>
                                <Ionicons name="timer-outline" size={16} color={COLORS.marron} />
                                <Text style={styles.metaText}>
                                    Prép. {item.temps_preparation} min
                                </Text>
                            </View>
                        )}
                        {item.temps_cuisson && (
                            <View style={styles.metaItem}>
                                <Ionicons name="flame" size={16} color={COLORS.iconfire} />
                                <Text style={styles.metaText}>
                                    Cuisson {item.temps_cuisson} min
                                </Text>
                            </View>
                        )}
                        {item.nombre_portions && (
                            <View style={styles.metaItem}>
                                <Ionicons name="people" size={16} color={COLORS.green} />
                                <Text style={styles.metaText}>
                                    {item.nombre_portions} personnes
                                </Text>
                            </View>
                        )}
                    </View>

                    {item.tags && item.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {item.tags.slice(0, 3).map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section }) => (
        <View style={styles.sectionHeader}>
            {section.title === 'Résultats' ? (
                <View style={styles.sectionTitleContainer}>
                    <Ionicons name="search-outline" size={20} color={COLORS.text} />
                    <Text style={styles.sectionTitle}>Résultats</Text>
                </View>
            ) : (
                <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.text} />
            </View>
        );
    }

    const allIds = sections.flatMap(section => section.data.map(item => item.id));
    const allSelected = selectedRecettes.length > 0 && selectedRecettes.length === allIds.length;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons 
                        name="search-outline" 
                        size={20} 
                        color={COLORS.marron} 
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher une recette..."
                        placeholderTextColor={COLORS.accent}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        editable={!selectionMode}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity 
                            style={styles.clearButton}
                            onPress={() => handleSearch('')}
                        >
                            <Ionicons name="close-circle" size={20} color={COLORS.marron} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filtres - masqués en mode sélection */}
            {!selectionMode && (
                <>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.filtersContainer}
                        contentContainerStyle={styles.filtersContent}
                    >
                        <TouchableOpacity
                            style={[styles.filterButton, filterActive === 'all' && styles.filterButtonActive]}
                            onPress={() => setFilterActive('all')}
                        >
                            <Text style={[styles.filterText, filterActive === 'all' && styles.filterTextActive]}>
                                Toutes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, filterActive === 'favoris' && styles.filterButtonActive]}
                            onPress={() => setFilterActive('favoris')}
                        >
                            <Text style={[styles.filterText, filterActive === 'favoris' && styles.filterTextActive]}>
                                Favoris
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, filterActive === 'recent' && styles.filterButtonActive]}
                            onPress={() => setFilterActive('recent')}
                        >
                            <Text style={[styles.filterText, filterActive === 'recent' && styles.filterTextActive]}>
                                Récentes
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryFiltersContainer}
                        contentContainerStyle={styles.categoryFiltersContent}
                    >
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'all' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('all')}
                        >
                            <Text style={[styles.categoryFilterText, categoryFilter === 'all' && styles.categoryFilterTextActive]}>
                                Toutes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'entrée' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('entrée')}
                        >
                            <View style={styles.categoryButtonContent}>
                                <MaterialCommunityIcons 
                                    name="bowl-mix-outline" 
                                    size={16} 
                                    color={categoryFilter === 'entrée' ? COLORS.background : COLORS.marron} 
                                />
                                <Text style={[styles.categoryFilterText, categoryFilter === 'entrée' && styles.categoryFilterTextActive]}>
                                    Entrées
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'plat' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('plat')}
                        >
                            <View style={styles.categoryButtonContent}>
                                <Ionicons 
                                    name="restaurant-outline" 
                                    size={16} 
                                    color={categoryFilter === 'plat' ? COLORS.background : COLORS.marron} 
                                />
                                <Text style={[styles.categoryFilterText, categoryFilter === 'plat' && styles.categoryFilterTextActive]}>
                                    Plats
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'dessert' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('dessert')}
                        >
                            <View style={styles.categoryButtonContent}>
                                <Ionicons 
                                    name="ice-cream-outline" 
                                    size={16} 
                                    color={categoryFilter === 'dessert' ? COLORS.background : COLORS.marron} 
                                />
                                <Text style={[styles.categoryFilterText, categoryFilter === 'dessert' && styles.categoryFilterTextActive]}>
                                    Desserts
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'snack' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('snack')}
                        >
                            <View style={styles.categoryButtonContent}>
                                <Ionicons 
                                    name="fast-food-outline" 
                                    size={16} 
                                    color={categoryFilter === 'snack' ? COLORS.background : COLORS.marron} 
                                />
                                <Text style={[styles.categoryFilterText, categoryFilter === 'snack' && styles.categoryFilterTextActive]}>
                                    Snacks
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'boisson' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('boisson')}
                        >
                            <View style={styles.categoryButtonContent}>
                                <Ionicons 
                                    name="cafe-outline" 
                                    size={16} 
                                    color={categoryFilter === 'boisson' ? COLORS.background : COLORS.marron} 
                                />
                                <Text style={[styles.categoryFilterText, categoryFilter === 'boisson' && styles.categoryFilterTextActive]}>
                                    Boissons
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.categoryFilterButton, categoryFilter === 'autre' && styles.categoryFilterButtonActive]}
                            onPress={() => setCategoryFilter('autre')}
                        >
                            <View style={styles.categoryButtonContent}>
                                <Ionicons 
                                    name="list-outline" 
                                    size={16} 
                                    color={categoryFilter === 'autre' ? COLORS.background : COLORS.marron} 
                                />
                                <Text style={[styles.categoryFilterText, categoryFilter === 'autre' && styles.categoryFilterTextActive]}>
                                    Autres
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </>
            )}

            {/* Barre de sélection */}
            {selectionMode && (
                <View style={styles.selectionBar}>
                    <TouchableOpacity onPress={handleCancelSelection}>
                        <View style={styles.selectionBarButton}>
                            <Ionicons name="close" size={18} color="#dc7226ff" />
                            <Text style={styles.cancelText}>Annuler</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.selectionText}>
                        {selectedRecettes.length} sélectionnée{selectedRecettes.length > 1 ? 's' : ''}
                    </Text>
                    <TouchableOpacity onPress={handleSelectAll}>
                        <Text style={styles.selectAllText}>
                            {allSelected ? 'Désélect. tout' : 'Tout sélect.'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Liste des recettes */}
            <View style={styles.contentWrapper}>
                {sections.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color={COLORS.accent} />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette pour le moment'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('ImportURL')}
                            >
                                <Text style={styles.addButtonText}>Ajouter ma première recette</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <SectionList
                        sections={sections}
                        renderItem={renderRecetteItem}
                        renderSectionHeader={renderSectionHeader}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={[
                            styles.listContainer,
                            selectionMode && styles.listContainerWithActions
                        ]}
                        stickySectionHeadersEnabled={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => loadRecettes(false)}
                                tintColor={COLORS.text}
                            />
                        }
                    />
                )}
            </View>

            {/* Barre d'actions en mode sélection */}
            {selectionMode && selectedRecettes.length > 0 && (
                <View style={styles.actionsBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.shareButton]}
                        onPress={handleShareSelected}
                    >
                        <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>
                            Partager ({selectedRecettes.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDeleteSelected}
                    >
                        <Ionicons name="trash-outline" size={20} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>
                            Supprimer ({selectedRecettes.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    searchInputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        paddingHorizontal: 16,
        paddingLeft: 40,
        paddingRight: 45,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 16,
        color: COLORS.text,
    },
    clearButton: {
        position: 'absolute',
        right: 12,
    },
    filtersContainer: {
        maxHeight: 44,
        flexGrow: 0,
    },
    filtersContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: COLORS.beigeclair,
        minHeight: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: COLORS.marron,
        borderColor: COLORS.marron,
    },
    filterText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
        includeFontPadding: false,
    },
    filterTextActive: {
        color: COLORS.background,
    },
    categoryFiltersContainer: {
        maxHeight: 44,
        flexGrow: 0,
    },
    categoryFiltersContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    categoryFilterButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: COLORS.beigeclair,
        minHeight: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    categoryFilterButtonActive: {
        backgroundColor: COLORS.marron,
        borderColor: COLORS.marron,
    },
    categoryFilterText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
        includeFontPadding: false,
    },
    categoryFilterTextActive: {
        color: COLORS.background,
    },
    selectionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#E8F5E9',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    selectionBarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cancelText: {
        fontSize: 14,
        color: '#dc7226ff',
        fontWeight: '600',
    },
    selectionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    selectAllText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '600',
    },
    contentWrapper: {
        flex: 1,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    listContainerWithActions: {
        paddingBottom: 120,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginTop: 8,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    sectionCount: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.accent,
        backgroundColor: COLORS.white,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    recetteCard: {
        backgroundColor: COLORS.beigeclair,
        padding: 16,
        marginBottom: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    recetteCardSelected: {
        borderColor: '#4CAF50',
        borderWidth: 2,
        backgroundColor: '#F1F8F4',
    },
    checkbox: {
        marginRight: 12,
        paddingTop: 2,
    },
    checkboxInner: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxInnerSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    recetteContent: {
        flex: 1,
    },
    recetteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    recetteTitre: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
        paddingRight: 8,
    },
    recetteMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 14,
        color: COLORS.accent,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    tag: {
        backgroundColor: COLORS.background,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tagText: {
        fontSize: 12,
        color: COLORS.text,
    },
    emptyContainer: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.accent,
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: COLORS.marron,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 8,
    },
    addButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    actionsBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 64,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    shareButton: {
        backgroundColor: '#4CAF50',
    },
    deleteButton: {
        backgroundColor: '#dc7226ff',
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});