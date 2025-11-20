// utils/iapManager.js
import { Platform, Alert } from 'react-native';
import RNIap, { 
    initConnection, 
    getProducts, 
    requestPurchase,
    purchaseUpdatedListener,
    purchaseErrorListener,
    getAvailablePurchases,
    acknowledgePurchaseAndroid,
    finishTransaction
} from 'react-native-iap';
import premiumManager from './premiumManager';

// ID du produit (celui qu'on a configuré dans Play Console)
const PRODUCT_ID_PREMIUM = 'premium';

class IAPManager {
    constructor() {
        this.isInitialized = false;
        this.products = [];
    }

    /**
     * Initialiser la connexion IAP
     */
    async init() {
        try {
            console.log('🛒 Initialisation IAP...');
            
            // Connexion au store (Google Play ou App Store)
            await initConnection();
            this.isInitialized = true;
            
            console.log('✅ IAP initialisé');
            
            // Charger les produits disponibles
            await this.loadProducts();
            
            // Écouter les mises à jour des achats
            this.setupPurchaseListener();
            
        } catch (error) {
            console.error('❌ Erreur init IAP:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Charger les produits disponibles depuis le store
     */
    async loadProducts() {
        try {
            console.log('📦 Chargement des produits...');
            
            // ✅ CORRECTION : Nouvelle API de react-native-iap
            const products = await getProducts([PRODUCT_ID_PREMIUM]);
            
            this.products = products;
            console.log('✅ Produits chargés:', products);
            
            return products;
        } catch (error) {
            console.error('❌ Erreur chargement produits:', error);
            return [];
        }
    }

    /**
     * Obtenir le produit Premium
     */
    getPremiumProduct() {
        return this.products.find(p => p.productId === PRODUCT_ID_PREMIUM);
    }

    /**
     * Acheter le Premium
     */
    async purchasePremium() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            console.log('💳 Démarrage de l\'achat...');
            
            // ✅ CORRECTION : Nouvelle API
            await requestPurchase({
                skus: [PRODUCT_ID_PREMIUM]
            });
            
            console.log('🔄 Achat en cours...');
            
        } catch (error) {
            console.error('❌ Erreur achat:', error);
            
            if (error.code === 'E_USER_CANCELLED') {
                console.log('🚫 Achat annulé par l\'utilisateur');
                return { success: false, cancelled: true };
            }
            
            Alert.alert(
                'Erreur',
                'Impossible d\'effectuer l\'achat. Veuillez réessayer.'
            );
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Écouter les mises à jour des achats
     */
    setupPurchaseListener() {
        // Listener pour les nouveaux achats
        this.purchaseUpdateSubscription = purchaseUpdatedListener(
            async (purchase) => {
                console.log('📥 Achat reçu:', purchase);
                
                const receipt = purchase.transactionReceipt;
                
                if (receipt) {
                    try {
                        // Activer le premium
                        await premiumManager.activatePremium();
                        
                        // Finaliser l'achat (important !)
                        if (Platform.OS === 'android') {
                            await acknowledgePurchaseAndroid({
                                token: purchase.purchaseToken,
                            });
                        } else {
                            await finishTransaction({
                                purchase,
                                isConsumable: false,
                            });
                        }
                        
                        console.log('✅ Premium activé avec succès !');
                        
                        Alert.alert(
                            '🎉 Merci !',
                            'Vous êtes maintenant Premium ! Profitez de toutes les fonctionnalités.',
                            [{ text: 'Super !' }]
                        );
                        
                    } catch (error) {
                        console.error('❌ Erreur finalisation achat:', error);
                    }
                }
            }
        );

        // Listener pour les erreurs d'achat
        this.purchaseErrorSubscription = purchaseErrorListener(
            (error) => {
                console.error('❌ Erreur achat:', error);
                
                if (error.code !== 'E_USER_CANCELLED') {
                    Alert.alert(
                        'Erreur',
                        'Une erreur est survenue lors de l\'achat.'
                    );
                }
            }
        );
    }

    /**
     * Restaurer les achats précédents
     */
    async restorePurchases() {
        try {
            console.log('🔄 Restauration des achats...');
            
            if (!this.isInitialized) {
                await this.init();
            }

            const purchases = await getAvailablePurchases();
            
            console.log('📦 Achats trouvés:', purchases);
            
            // Chercher si l'utilisateur a acheté le premium
            const premiumPurchase = purchases.find(
                p => p.productId === PRODUCT_ID_PREMIUM
            );
            
            if (premiumPurchase) {
                // Activer le premium
                await premiumManager.activatePremium();
                
                Alert.alert(
                    '✅ Restauration réussie',
                    'Votre achat Premium a été restauré !'
                );
                
                return { success: true, restored: true };
            } else {
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
    }

    /**
     * Nettoyer les listeners
     */
    cleanup() {
        if (this.purchaseUpdateSubscription) {
            this.purchaseUpdateSubscription.remove();
        }
        if (this.purchaseErrorSubscription) {
            this.purchaseErrorSubscription.remove();
        }
    }
}

// Instance singleton
const iapManager = new IAPManager();

export default iapManager;