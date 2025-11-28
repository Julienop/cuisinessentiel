// utils/IAPContext.js
// ✅ Compatible react-native-iap v14.4.x avec useIAP hook
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useIAP, ErrorCode } from 'react-native-iap';
import premiumManager from './premiumManager';

// ID du produit (celui configuré dans Play Console)
const PRODUCT_ID_PREMIUM = 'premium';

// Créer le contexte
const IAPContext = createContext(null);

/**
 * Provider IAP à placer à la racine de l'app
 */
export function IAPProvider({ children }) {
    const [isReady, setIsReady] = useState(false);
    
    const {
        connected,
        products,
        fetchProducts,
        requestPurchase,
        finishTransaction,
        currentPurchase,
        currentPurchaseError,
        availablePurchases,
        getAvailablePurchases,
    } = useIAP({
        // Callback quand un achat réussit
        onPurchaseSuccess: async (purchase) => {
            console.log('📥 Achat réussi:', purchase.productId);
            
            try {
                // Activer le premium
                await premiumManager.activatePremium();
                
                // Finaliser la transaction
                await finishTransaction({
                    purchase,
                    isConsumable: false,
                });
                
                console.log('✅ Premium activé avec succès !');
                
                Alert.alert(
                    '🎉 Merci !',
                    'Vous êtes maintenant Premium ! Profitez de toutes les fonctionnalités.',
                    [{ text: 'Super !' }]
                );
            } catch (error) {
                console.error('❌ Erreur finalisation achat:', error);
            }
        },
        
        // Callback quand un achat échoue
        onPurchaseError: async (error) => {
            console.error('❌ Erreur achat:', error);
            
            // ✅ NOUVEAU : Si "already-owned", c'est que l'utilisateur a déjà acheté !
            if (error.code === 'already-owned' || error.code === 'E_ALREADY_OWNED') {
                console.log('✅ Article déjà possédé, activation du premium...');
                await premiumManager.activatePremium();
                
                Alert.alert(
                    '✅ Premium activé',
                    'Votre achat précédent a été restauré !',
                    [{ text: 'Super !' }]
                );
                return;
            }
            
            if (error.code !== ErrorCode.UserCancelled && error.code !== 'E_USER_CANCELLED') {
                Alert.alert(
                    'Erreur',
                    'Une erreur est survenue lors de l\'achat.'
                );
            }
        },
    });

    // Charger les produits quand connecté
    useEffect(() => {
        if (connected) {
            console.log('🛒 IAP connecté, chargement des produits...');
            
            fetchProducts({
                skus: [PRODUCT_ID_PREMIUM],
                type: 'in-app',  // ✅ CORRIGÉ : 'in-app' au lieu de 'inapp'
            }).then(() => {
                console.log('✅ Produits chargés');
                setIsReady(true);
            }).catch((error) => {
                console.error('❌ Erreur chargement produits:', error);
                setIsReady(true); // On continue quand même
            });
        }
    }, [connected, fetchProducts]);

    // Log des produits chargés
    useEffect(() => {
        if (products && products.length > 0) {
            console.log('📦 Produits disponibles:', JSON.stringify(products, null, 2));
        }
    }, [products]);

    /**
     * Acheter le Premium
     */
    const purchasePremium = useCallback(async () => {
        try {
            if (!connected) {
                Alert.alert('Erreur', 'Connexion au store non disponible.');
                return { success: false, error: 'Not connected' };
            }

            if (!products || products.length === 0) {
                Alert.alert('Erreur', 'Produits non disponibles. Veuillez réessayer.');
                return { success: false, error: 'No products' };
            }

            console.log('💳 Démarrage de l\'achat...');

            await requestPurchase({
                request: {
                    ios: {
                        sku: PRODUCT_ID_PREMIUM,
                    },
                    android: {
                        skus: [PRODUCT_ID_PREMIUM],
                    },
                },
            });

            console.log('🔄 Achat en cours...');
            return { success: true };

        } catch (error) {
            console.error('❌ Erreur achat:', error);

            // ✅ NOUVEAU : Gérer "already-owned" comme un succès
            if (error.code === 'already-owned' || error.code === 'E_ALREADY_OWNED') {
                console.log('✅ Article déjà possédé, activation du premium...');
                await premiumManager.activatePremium();
                
                Alert.alert(
                    '✅ Premium activé',
                    'Votre achat précédent a été restauré !',
                    [{ text: 'Super !' }]
                );
                
                return { success: true, restored: true };
            }

            if (error.code === ErrorCode.UserCancelled || error.code === 'E_USER_CANCELLED') {
                console.log('🚫 Achat annulé par l\'utilisateur');
                return { success: false, cancelled: true };
            }

            Alert.alert(
                'Erreur',
                'Impossible d\'effectuer l\'achat. Veuillez réessayer.'
            );

            return { success: false, error: error.message };
        }
    }, [connected, products, requestPurchase]);

    /**
     * Restaurer les achats
     */
    const restorePurchases = useCallback(async () => {
        try {
            console.log('🔄 Restauration des achats...');

            // ✅ CORRIGÉ : Appeler la fonction et attendre le résultat
            let purchases = [];
            
            try {
                purchases = await getAvailablePurchases();
            } catch (e) {
                console.log('⚠️ getAvailablePurchases erreur:', e);
            }
            
            console.log('📦 Achats trouvés:', JSON.stringify(purchases, null, 2));

            // Si pas d'achats trouvés, on vérifie aussi availablePurchases du hook
            if (!purchases || purchases.length === 0) {
                purchases = availablePurchases || [];
                console.log('📦 Achats depuis hook:', JSON.stringify(purchases, null, 2));
            }

            const premiumPurchase = purchases?.find(
                p => p.productId === PRODUCT_ID_PREMIUM || p.id === PRODUCT_ID_PREMIUM
            );

            if (premiumPurchase) {
                await premiumManager.activatePremium();

                Alert.alert(
                    '✅ Restauration réussie',
                    'Votre achat Premium a été restauré !'
                );

                return { success: true, restored: true };
            } else {
                // ✅ NOUVEAU : Tenter un achat pour déclencher "already-owned"
                console.log('🔄 Tentative de vérification via achat...');
                
                try {
                    await requestPurchase({
                        request: {
                            ios: { sku: PRODUCT_ID_PREMIUM },
                            android: { skus: [PRODUCT_ID_PREMIUM] },
                        },
                    });
                } catch (purchaseError) {
                    // Si "already-owned", c'est bon !
                    if (purchaseError.code === 'already-owned' || purchaseError.code === 'E_ALREADY_OWNED') {
                        await premiumManager.activatePremium();
                        
                        Alert.alert(
                            '✅ Restauration réussie',
                            'Votre achat Premium a été restauré !'
                        );
                        
                        return { success: true, restored: true };
                    }
                    // Sinon on ignore (utilisateur a annulé ou autre)
                }
                
                Alert.alert(
                    'Aucun achat trouvé',
                    'Aucun achat Premium n\'a été trouvé sur ce compte.'
                );

                return { success: true, restored: false };
            }

        } catch (error) {
            console.error('❌ Erreur restauration:', error);

            Alert.alert(
                'Erreur',
                'Impossible de restaurer les achats.'
            );

            return { success: false, error: error.message };
        }
    }, [getAvailablePurchases, availablePurchases, requestPurchase]);

    /**
     * Obtenir le produit Premium
     */
    const getPremiumProduct = useCallback(() => {
        return products?.find(p => p.productId === PRODUCT_ID_PREMIUM || p.id === PRODUCT_ID_PREMIUM) || null;
    }, [products]);

    // Valeur du contexte
    const value = {
        // État
        isConnected: connected,
        isReady,
        products,
        
        // Actions
        purchasePremium,
        restorePurchases,
        getPremiumProduct,
    };

    return (
        <IAPContext.Provider value={value}>
            {children}
        </IAPContext.Provider>
    );
}

/**
 * Hook pour utiliser le contexte IAP
 */
export function useIAPContext() {
    const context = useContext(IAPContext);
    
    if (!context) {
        throw new Error('useIAPContext doit être utilisé dans un IAPProvider');
    }
    
    return context;
}

// Export par défaut pour compatibilité
export default {
    IAPProvider,
    useIAPContext,
};