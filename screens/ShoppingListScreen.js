// screens/ShoppingListScreen.js
// Écran de la liste de courses

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import db from '../database/db';
import { Ionicons } from '@expo/vector-icons';

export default function ShoppingListScreen({ navigation }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newItem, setNewItem] = useState({ ingredient: '', quantite: '', unite: '' });
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadShoppingList();
    }, []);

    const loadShoppingList = async () => {
        try {
            setLoading(true);
            const list = await db.getShoppingList();
            setItems(list);
        } catch (error) {
            console.error('Erreur chargement liste:', error);
            Alert.alert('Erreur', 'Impossible de charger la liste de courses');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadShoppingList();
        setRefreshing(false);
    };

    const handleToggleItem = async (id) => {
        try {
            await db.toggleShoppingItem(id);
            await loadShoppingList();
        } catch (error) {
            console.error('Erreur toggle item:', error);
        }
    };

    const handleDeleteItem = async (id) => {
        Alert.alert(
            'Supprimer',
            'Voulez-vous supprimer cet ingrédient ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.deleteShoppingItem(id);
                            await loadShoppingList();
                        } catch (error) {
                            console.error('Erreur suppression:', error);
                        }
                    }
                }
            ]
        );
    };

    const handleAddManualItem = async () => {
        if (!newItem.ingredient.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom d\'ingrédient');
            return;
        }

        try {
            await db.addManualShoppingItem(
                newItem.ingredient.trim(),
                newItem.quantite.trim(),
                newItem.unite.trim()
            );
            
            // Réinitialiser le formulaire
            setNewItem({ ingredient: '', quantite: '', unite: '' });
            setAddModalVisible(false);
            
            // Recharger la liste
            await loadShoppingList();
            
        } catch (error) {
            console.error('Erreur ajout article:', error);
            Alert.alert('Erreur', 'Impossible d\'ajouter l\'article');
        }
    };

    const handleClearChecked = async () => {
        const checkedCount = items.filter(item => item.checked === 1).length;
        
        if (checkedCount === 0) {
            Alert.alert('Info', 'Aucun élément coché à supprimer');
            return;
        }

        Alert.alert(
            'Supprimer les éléments cochés',
            `Supprimer ${checkedCount} élément(s) coché(s) ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.clearCheckedItems();
                            await loadShoppingList();
                        } catch (error) {
                            console.error('Erreur suppression cochés:', error);
                        }
                    }
                }
            ]
        );
    };

    const handleClearAll = async () => {
        if (items.length === 0) {
            Alert.alert('Info', 'La liste est déjà vide');
            return;
        }

        Alert.alert(
            'Vider la liste',
            'Voulez-vous supprimer tous les éléments de la liste ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Tout supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.clearShoppingList();
                            await loadShoppingList();
                        } catch (error) {
                            console.error('Erreur vidage liste:', error);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => {
        const displayQuantite = item.quantite 
            ? `${item.quantite} ${item.unite || ''}`.trim()
            : '';

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => handleToggleItem(item.id)}
                onLongPress={() => handleDeleteItem(item.id)}
                activeOpacity={0.7}
            >
                {/* Checkbox */}
                <View style={[styles.checkbox, item.checked === 1 && styles.checkboxChecked]}>
                    {item.checked === 1 && <Text style={styles.checkmark}>✓</Text>}
                </View>

                {/* Contenu */}
                <View style={styles.itemContent}>
                    <Text style={[
                        styles.itemName,
                        item.checked === 1 && styles.itemNameChecked
                    ]}>
                        {item.ingredient}
                    </Text>
                    
                    {displayQuantite && (
                        <Text style={[
                            styles.itemQuantite,
                            item.checked === 1 && styles.itemQuantiteChecked
                        ]}>
                            {displayQuantite}
                        </Text>
                    )}
                    
                    {item.recette_titre && (
                        <Text style={styles.itemRecette} numberOfLines={1}>
                            De : {item.recette_titre}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const uncheckedCount = items.filter(item => item.checked === 0).length;
    const checkedCount = items.filter(item => item.checked === 1).length;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Stats */}
            {items.length > 0 && (
                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>
                        {uncheckedCount} à acheter · {checkedCount} coché{checkedCount > 1 ? 's' : ''}
                    </Text>
                </View>
            )}

            {/* Liste */}
            {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={64} color={COLORS.marron} />
                    <Text style={styles.emptyText}>Votre liste est vide</Text>
                    <Text style={styles.emptySubtext}>
                        Ajoutez des ingrédients depuis les détails d'une recette{'\n'}
                        ou appuyez sur le bouton + pour ajouter manuellement
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.text}
                        />
                    }
                />
            )}

            {/* Bouton Flottant Ajouter */}
            <TouchableOpacity
                style={[styles.fab, { bottom: items.length > 0 ? 160 : 60 }]}
                onPress={() => setAddModalVisible(true)}
            >
                <Ionicons name="add" size={32} color={COLORS.background} />
            </TouchableOpacity>

            {/* Actions */}
            {items.length > 0 && (
                <View style={[
                    styles.actionsContainer,
                    { paddingBottom: Math.max(insets.bottom, 24) }
                ]}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleClearChecked}
                    ><Ionicons name="checkmark-sharp" size={20} color={COLORS.background} />
                        <Text style={styles.actionButtonText}>
                            Supprimer cochés
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleClearAll}
                    ><Ionicons name="trash-outline" size={20} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>
                        Vider la liste
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modale Ajouter Article */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ajouter un article</Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <Ionicons name="close" size={28} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            {/* Ingrédient (obligatoire) */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Ingrédient <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Farine, Oeufs, Lait..."
                                    value={newItem.ingredient}
                                    onChangeText={(text) => setNewItem({ ...newItem, ingredient: text })}
                                    autoFocus
                                />
                            </View>

                            {/* Quantité et Unité (optionnels) */}
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Quantité</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: 250"
                                        value={newItem.quantite}
                                        onChangeText={(text) => setNewItem({ ...newItem, quantite: text })}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Unité</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: g, ml, pièce"
                                        value={newItem.unite}
                                        onChangeText={(text) => setNewItem({ ...newItem, unite: text })}
                                    />
                                </View>
                            </View>

                            <Text style={styles.hint}>
                                La quantité et l'unité sont optionnelles
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setNewItem({ ingredient: '', quantite: '', unite: '' });
                                    setAddModalVisible(false);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.addButton]}
                                onPress={handleAddManualItem}
                            >
                                <Text style={styles.addButtonText}>Ajouter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    statsContainer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statsText: {
        fontSize: 14,
        color: COLORS.accent,
        fontWeight: '500',
    },
    listContent: {
        padding: 24,
        paddingBottom: 160,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        marginBottom: 12,
        backgroundColor: COLORS.beigeclair,
        borderRadius: 8,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.text,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: COLORS.text,
    },
    checkmark: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '700',
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    itemNameChecked: {
        textDecorationLine: 'line-through',
        color: '#999999',
    },
    itemQuantite: {
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 4,
        fontWeight: '500',
    },
    itemQuantiteChecked: {
        textDecorationLine: 'line-through',
        color: '#999999',
    },
    itemRecette: {
        fontSize: 13,
        color: COLORS.accent,
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 16,
        color: COLORS.accent,
        textAlign: 'center',
        lineHeight: 24,
    },
    fab: {
        position: 'absolute',
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.marron,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsContainer: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 24,
        paddingTop: 20,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,             
        paddingVertical: 16,
        backgroundColor: COLORS.marron,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.background,
    },
    // Modale
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
    },
    form: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    required: {
        color: COLORS.marron,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: COLORS.beigeclair,
        color: COLORS.text,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    hint: {
        fontSize: 13,
        color: COLORS.accent,
        fontStyle: 'italic',
        marginTop: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.beigeclair,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    addButton: {
        backgroundColor: COLORS.marron,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.background,
    },
});