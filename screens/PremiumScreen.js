// screens/PremiumScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import premiumManager, { LIMITE_RECETTES_GRATUIT } from '../utils/premiumManager';
import iapManager from '../utils/iapManager';
import { useFocusEffect } from '@react-navigation/native';

export default function PremiumScreen({ navigation }) {
    const [purchasing, setPurchasing] = useState(false);
    const [price, setPrice] = useState('4,99 €');

    useFocusEffect(
        React.useCallback(() => {
            loadPrice();
        }, [])
    );

    const loadPrice = async () => {
        const product = iapManager.getPremiumProduct();
        if (product && product.localizedPrice) {
            setPrice(product.localizedPrice);
        }
    };

    const handlePurchase = async () => {
        setPurchasing(true);
        
        const result = await iapManager.purchasePremium();
        
        setPurchasing(false);
        
        // Si l'achat est réussi, on ferme l'écran
        if (result && !result.cancelled) {
            navigation.goBack();
        }
    };

    const handleRestore = async () => {
        const result = await iapManager.restorePurchases();
        
        if (result && result.restored) {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                
                {/* Icône Premium */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="star" size={60} color="#FFD700" />
                    </View>
                </View>

                {/* Titre */}
                <Text style={styles.title}>Passez Premium</Text>
                <Text style={styles.subtitle}>
                    Débloquez toutes les fonctionnalités
                </Text>

                {/* Avantages */}
                <View style={styles.featuresContainer}>
                    <View style={styles.feature}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="infinite" size={28} color={COLORS.marron} />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Recettes illimitées</Text>
                            <Text style={styles.featureDescription}>
                                Ajoutez autant de recettes que vous voulez (actuellement limité à {LIMITE_RECETTES_GRATUIT})
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="cart" size={28} color={COLORS.marron} />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Liste de courses</Text>
                            <Text style={styles.featureDescription}>
                                Créez vos listes de courses automatiquement depuis vos recettes
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="cloud-upload" size={28} color={COLORS.marron} />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Import & Export</Text>
                            <Text style={styles.featureDescription}>
                                Sauvegardez et partagez vos recettes en toute liberté
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="shield-checkmark" size={28} color={COLORS.marron} />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Respect de la vie privée</Text>
                            <Text style={styles.featureDescription}>
                                Pas de pub, pas de tracking, toutes vos données restent sur votre appareil
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="heart" size={28} color="#dc7226ff" />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Soutenez le développement</Text>
                            <Text style={styles.featureDescription}>
                                Aidez-moi à améliorer l'app et à ajouter de nouvelles fonctionnalités
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Prix */}
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Paiement unique</Text>
                    <Text style={styles.price}>{price}</Text>
                    <Text style={styles.priceSubtext}>Pas d'abonnement, à vie</Text>
                </View>

            </ScrollView>

            {/* Boutons fixes en bas */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={[styles.purchaseButton, purchasing && styles.buttonDisabled]}
                    onPress={handlePurchase}
                    disabled={purchasing}
                >
                    {purchasing ? (
                        <ActivityIndicator color={COLORS.background} />
                    ) : (
                        <Text style={styles.purchaseButtonText}>
                            Débloquer Premium - {price}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={handleRestore}  // ✅ Connecté !
                >
                    <Text style={styles.restoreButtonText}>
                        Restaurer mes achats
                    </Text>
                </TouchableOpacity>

                <Text style={styles.legalText}>
                    Paiement unique sans abonnement. En achetant, vous acceptez les conditions d'utilisation.
                </Text>
            </View>
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
    content: {
        padding: 24,
        paddingBottom: 200, // Espace pour les boutons fixes
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.beigeclair,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: COLORS.accent,
        textAlign: 'center',
        marginBottom: 32,
    },
    featuresContainer: {
        gap: 20,
        marginBottom: 32,
    },
    feature: {
        flexDirection: 'row',
        gap: 16,
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.beigeclair,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 15,
        color: COLORS.accent,
        lineHeight: 22,
    },
    priceContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    priceLabel: {
        fontSize: 14,
        color: COLORS.accent,
        marginBottom: 8,
    },
    price: {
        fontSize: 48,
        fontWeight: '700',
        color: COLORS.marron,
        marginBottom: 4,
    },
    priceSubtext: {
        fontSize: 14,
        color: COLORS.accent,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 45,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 8,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    purchaseButton: {
        backgroundColor: COLORS.marron,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    purchaseButtonText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: '600',
    },
    restoreButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    restoreButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    legalText: {
        fontSize: 12,
        color: COLORS.accent,
        textAlign: 'center',
        lineHeight: 18,
    },
});