// screens/PremiumModal.js
// Modal pour passer à la version Premium

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    // import { usePremium } from '../contexts/PremiumContext';

    export default function PremiumModal({ visible, onClose }) {
    const { purchasePremium, restorePurchases, products } = usePremium();
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const handlePurchase = async () => {
        setPurchasing(true);
        await purchasePremium();
        setPurchasing(false);
        onClose();
    };

    const handleRestore = async () => {
        setRestoring(true);
        await restorePurchases();
        setRestoring(false);
        onClose();
    };

    // Prix du produit (si disponible)
    const price = products[0]?.price || '4,99€';

    return (
        <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        >
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Icône */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>⭐</Text>
            </View>

            {/* Titre */}
            <Text style={styles.title}>Passez à Premium</Text>
            <Text style={styles.subtitle}>
                Débloquez toutes les fonctionnalités
            </Text>

            {/* Avantages */}
            <View style={styles.featuresContainer}>
                <View style={styles.feature}>
                <Text style={styles.featureIcon}>♾️</Text>
                <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Recettes illimitées</Text>
                    <Text style={styles.featureDescription}>
                    Ajoutez autant de recettes que vous voulez
                    </Text>
                </View>
                </View>

                <View style={styles.feature}>
                <Text style={styles.featureIcon}>💾</Text>
                <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Sauvegarde illimitée</Text>
                    <Text style={styles.featureDescription}>
                    Toutes vos recettes en local, hors ligne
                    </Text>
                </View>
                </View>

                <View style={styles.feature}>
                <Text style={styles.featureIcon}>🎉</Text>
                <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Support le développement</Text>
                    <Text style={styles.featureDescription}>
                    Aidez-nous à améliorer l'app
                    </Text>
                </View>
                </View>

                <View style={styles.feature}>
                <Text style={styles.featureIcon}>🔒</Text>
                <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Respect de votre vie privée</Text>
                    <Text style={styles.featureDescription}>
                    Aucune publicité, aucun tracking
                    </Text>
                </View>
                </View>
            </View>

            {/* Prix */}
            <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Paiement unique</Text>
                <Text style={styles.price}>{price}</Text>
                <Text style={styles.priceSubtext}>Pas d'abonnement</Text>
            </View>

            {/* Boutons */}
            <TouchableOpacity
                style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
                onPress={handlePurchase}
                disabled={purchasing}
            >
                {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
                ) : (
                <Text style={styles.purchaseButtonText}>
                    Débloquer Premium
                </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={restoring}
            >
                {restoring ? (
                <ActivityIndicator color="#000000" />
                ) : (
                <Text style={styles.restoreButtonText}>
                    Restaurer mes achats
                </Text>
                )}
            </TouchableOpacity>

            {/* Note légale */}
            <Text style={styles.legalText}>
                L'achat sera débité sur votre compte iTunes/Google Play. 
                Aucun abonnement, paiement unique.
            </Text>
            </ScrollView>
        </SafeAreaView>
        </Modal>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 28,
        color: '#000000',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        paddingTop: 12,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    icon: {
        fontSize: 80,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 40,
    },
    featuresContainer: {
        gap: 20,
        marginBottom: 40,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    featureIcon: {
        fontSize: 32,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 15,
        color: '#666666',
        lineHeight: 22,
    },
    priceContainer: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 24,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E0E0E0',
    },
    priceLabel: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
    },
    price: {
        fontSize: 48,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 4,
    },
    priceSubtext: {
        fontSize: 14,
        color: '#666666',
    },
    purchaseButton: {
        backgroundColor: '#000000',
        paddingVertical: 18,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    purchaseButtonDisabled: {
        opacity: 0.5,
    },
    purchaseButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    restoreButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    restoreButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '500',
    },
    legalText: {
        fontSize: 12,
        color: '#999999',
        textAlign: 'center',
        lineHeight: 18,
    },
});