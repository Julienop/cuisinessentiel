// App.js - VERSION AVEC IAP v14
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StatusBar as RNStatusBar } from 'react-native';
import { ActivityIndicator, View, StyleSheet, Image, Text, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from './constants/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setupDeepLinking } from './utils/deepLinking';
import premiumManager from './utils/premiumManager';
import db from './database/db';
import { IAPProvider } from './utils/IAPContext';

import HomeScreen from './screens/HomeScreen';
import RecetteListScreen from './screens/RecetteListScreen';
import RecetteDetailScreen from './screens/RecetteDetailScreen';
import RecetteEditScreen from './screens/RecetteEditScreen';
import AddRecetteScreen from './screens/AddRecetteScreen';
import ImportURLScreen from './screens/ImportURLScreen';
import CookingModeScreen from './screens/CookingModeScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';
import ExportImportScreen from './screens/ExportImportScreen';
import SettingsScreen from './screens/SettingsScreen';
import PremiumScreen from './screens/PremiumScreen';
// ❌ SUPPRIMÉ : import iapManager from './utils/iapManager';

const Stack = createNativeStackNavigator();

const HeaderWithLogo = ({ title }) => (
  <View style={styles.headerContainer}>
    <Image
      source={require('./assets/icon.png')}
      style={styles.headerLogo}
      resizeMode="contain"
    />
    <Text style={styles.headerTitle}>
      {title || 'Cuisin\'Essentiel'}
    </Text>
  </View>
);

const SettingsButton = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => navigation.navigate('Settings')}
    style={{ padding: 8 }}
  >
    <Ionicons name="settings-sharp" size={26} color={COLORS.marron} />
  </TouchableOpacity>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const navigationRef = React.useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (dbReady && navigationRef.current) {
        console.log('🔗 Configuration deep linking...');
        const cleanup = setupDeepLinking(navigationRef.current);
        return cleanup;
    }
  }, [dbReady]);

  // ❌ SUPPRIMÉ : le cleanup de iapManager (géré par IAPProvider maintenant)

  useEffect(() => {
    // Forcer la navigationBar en mode sombre (boutons foncés)
    if (Platform.OS === 'android') {
        RNStatusBar.setBarStyle('dark-content');
    }
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initialisation de l\'application...');
      await db.init();
      // initialiser le premium manager
      await premiumManager.init();
      // ❌ SUPPRIMÉ : await iapManager.init(); (géré par IAPProvider maintenant)
      setDbReady(true);
      console.log('Application initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text} />
      </View>
    );
  }

  // ✅ MODIFIÉ : On wrap tout avec IAPProvider
  return (
    <IAPProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={({ navigation }) => ({
              headerStyle: {
                backgroundColor: COLORS.background,
              },
              headerTintColor: COLORS.text,
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
              headerShadowVisible: false,
              contentStyle: {
                backgroundColor: COLORS.background,
              },
              headerRight: () => <SettingsButton navigation={navigation} />,
            })}
          >
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                headerTitle: () => <HeaderWithLogo title="Accueil" />,
              }}
            />

            <Stack.Screen 
              name="RecetteList" 
              component={RecetteListScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Toutes mes recettes" />
              }}
            />
            
            <Stack.Screen 
              name="RecetteDetail" 
              component={RecetteDetailScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Recette" />
              }}
            />
            
            <Stack.Screen 
              name="RecetteEdit" 
              component={RecetteEditScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Modifier" />
              }}
            />
            
            <Stack.Screen 
              name="AddRecette" 
              component={AddRecetteScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Nouvelle recette" />,
                presentation: 'modal',
              }}
            />
            
            <Stack.Screen 
              name="ImportURL" 
              component={ImportURLScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Importer une recette" />,
                presentation: 'modal',
              }}
            />
            
            <Stack.Screen 
              name="CookingMode" 
              component={CookingModeScreen}
              options={{ 
                title: '',
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            
            <Stack.Screen 
              name="ShoppingList" 
              component={ShoppingListScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Liste de courses" />
              }}
            />

            <Stack.Screen 
              name="ExportImport" 
              component={ExportImportScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Sauvegarde" />
              }}
            />

            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={({ navigation }) => ({ 
                headerTitle: () => <HeaderWithLogo title="Paramètres" />,
                headerRight: () => <View />,
              })}
            />

            <Stack.Screen 
              name="Premium" 
              component={PremiumScreen}
              options={{ 
                headerTitle: () => <HeaderWithLogo title="Premium" />,
                presentation: 'modal',
              }}
            />

          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </IAPProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  homeLogo: {
    width: 150,
    height: 150,
  },
});