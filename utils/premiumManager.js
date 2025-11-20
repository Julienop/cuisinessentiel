// utils/premiumManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@cuisinessentiel_premium';
const LIMITE_RECETTES_GRATUIT = 15;

// 🔧 MODE DEV - Mettre à false avant publication !
const DEV_FORCE_PREMIUM = false;

class PremiumManager {
    constructor() {
        this.isPremiumUser = false;
        this.isInitialized = false;
    }

    /**
     * Initialiser le statut premium au démarrage de l'app
     */
    async init() {
        try {
            // MODE DEV : Forcer le premium en développement
            if (__DEV__ && DEV_FORCE_PREMIUM) {
                this.isPremiumUser = true;
                this.isInitialized = true;
                console.log('🔧 MODE DEV: Premium forcé');
                return;
            }

            const premiumStatus = await AsyncStorage.getItem(PREMIUM_KEY);
            this.isPremiumUser = premiumStatus === 'true';
            this.isInitialized = true;
            console.log('🎖️ Statut premium:', this.isPremiumUser ? 'PREMIUM' : 'GRATUIT');
        } catch (error) {
            console.error('Erreur init premium:', error);
            this.isPremiumUser = false;
            this.isInitialized = true;
        }
    }

    /**
     * Vérifier si l'utilisateur est premium
     */
    isPremium() {
        // MODE DEV : Forcer le premium en développement
        if (__DEV__ && DEV_FORCE_PREMIUM) {
            return true;
        }
        
        return this.isPremiumUser;
    }

    /**
     * Activer le premium (après achat)
     */
    async activatePremium() {
        try {
            await AsyncStorage.setItem(PREMIUM_KEY, 'true');
            this.isPremiumUser = true;
            console.log('✅ Premium activé !');
            return true;
        } catch (error) {
            console.error('Erreur activation premium:', error);
            return false;
        }
    }

    /**
     * Vérifier si l'utilisateur peut ajouter une recette
     */
    async canAddRecette(currentCount) {
        if (this.isPremium()) {
            return { canAdd: true, reason: null };
        }

        if (currentCount >= LIMITE_RECETTES_GRATUIT) {
            return {
                canAdd: false,
                reason: `Vous avez atteint la limite de ${LIMITE_RECETTES_GRATUIT} recettes en version gratuite.\n\nPassez Premium pour ajouter un nombre illimité de recettes !`
            };
        }

        return { canAdd: true, reason: null };
    }

    /**
     * Vérifier si l'utilisateur peut accéder à une fonctionnalité premium
     */
    canAccessFeature(featureName) {
        if (this.isPremium()) {
            return { canAccess: true, reason: null };
        }

        const messages = {
            shopping_list: 'La liste de courses est une fonctionnalité Premium.\n\nPassez Premium pour y accéder !',
            export: 'L\'export de recettes est une fonctionnalité Premium.\n\nPassez Premium pour sauvegarder vos recettes !',
            import: 'L\'import de recettes est une fonctionnalité Premium.\n\nPassez Premium pour importer des recettes !'
        };

        return {
            canAccess: false,
            reason: messages[featureName] || 'Cette fonctionnalité est réservée aux utilisateurs Premium.'
        };
    }

    /**
     * Obtenir la limite de recettes
     */
    getRecetteLimit() {
        return this.isPremium() ? Infinity : LIMITE_RECETTES_GRATUIT;
    }

    /**
     * Pour le développement : réinitialiser le premium
     */
    async resetPremium() {
        try {
            await AsyncStorage.removeItem(PREMIUM_KEY);
            this.isPremiumUser = false;
            console.log('🔄 Premium réinitialisé');
        } catch (error) {
            console.error('Erreur reset premium:', error);
        }
    }
}

// Instance singleton
const premiumManager = new PremiumManager();

export default premiumManager;
export { LIMITE_RECETTES_GRATUIT };