/**
 * Root Application Component
 * AI-Powered Farmer Decision Support Platform
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { logger } from './src/utils/logger';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import MarketScreen from './src/screens/MarketScreen';
import SoilHealthScreen from './src/screens/SoilHealthScreen';
import SchemesScreen from './src/screens/SchemesScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import { DashboardService } from './src/services/dashboard/DashboardService';
import { DashboardAggregator } from './src/services/dashboard/DashboardAggregator';
import { PriorityEngine } from './src/services/dashboard/PriorityEngine';
import { weatherService } from './src/services/weather/WeatherService';
import { AlertScheduler } from './src/services/alert/AlertScheduler';
import { marketService } from './src/services/market/MarketService';
import { profileManager } from './src/services/profile/ProfileManager';
import { DatabaseService } from './src/services/storage/DatabaseService';
import { initializeTranslationServices } from './src/hooks/useTranslation';
import uiTranslations from './src/services/translation/translations/ui.translations';
import { encryptedStorage } from './src/services/storage/EncryptedStorage';

// Initialize services
const db = new DatabaseService();
const alertScheduler = new AlertScheduler(db);
const aggregator = new DashboardAggregator(
  weatherService,
  alertScheduler,
  marketService,
  profileManager,
  db,
);
const priorityEngine = new PriorityEngine();
const dashboardService = new DashboardService(aggregator, priorityEngine);

// Initialize simple translation service for demo
const createSimpleTranslationService = () => {
  const translations = uiTranslations.en;
  return {
    translate: (key: string) => {
      return (translations as Record<string, string>)[key] || key.split('.').pop() || key;
    },
    initialize: async () => {},
    setLanguage: async () => {},
  };
};

const translationService = createSimpleTranslationService() as any;
const languagePreferenceManager = {
  getLanguagePreference: async () => 'en' as const,
  setRegistrationLanguage: async (_lang: string) => {},
} as any;

// Initialize translation hook
initializeTranslationServices(translationService, languagePreferenceManager);

// Create navigation stack
const Stack = createNativeStackNavigator();

function DashboardWrapper({ navigation }: { navigation: any }) {
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get userId from stored session
    const getUserId = async () => {
      const storedUserId = await encryptedStorage.getItem<string>('current_user_id');
      setUserId(storedUserId);
    };
    getUserId();
  }, []);

  if (!userId) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <DashboardScreen
      userId={userId}
      dashboardService={dashboardService}
      navigation={navigation}
    />
  );
}

function LoginWrapper({ navigation }: { navigation: any }) {
  const handleLoginSuccess = async (userId: string, token: string) => {
    // Store session info
    await encryptedStorage.setItem('auth_token', token);
    await encryptedStorage.setItem('current_user_id', userId);

    // Check if user has profile
    const hasProfile = await profileManager.hasProfile();

    if (hasProfile) {
      // Navigate to dashboard
      navigation.replace('Dashboard');
    } else {
      // Navigate to registration - extract mobile number from userId
      const mobileNumber = userId.replace('user_', '');
      navigation.replace('Registration', { mobileNumber });
    }
  };

  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}

function RegistrationWrapper({ navigation, route }: { navigation: any; route: any }) {
  const { mobileNumber } = route.params;

  const handleRegistrationComplete = () => {
    navigation.replace('Dashboard');
  };

  return (
    <RegistrationScreen
      mobileNumber={mobileNumber}
      onRegistrationComplete={handleRegistrationComplete}
    />
  );
}

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('Application started');
        
        // Check if user is authenticated
        const authToken = await encryptedStorage.getItem<string>('auth_token');
        const userId = await encryptedStorage.getItem<string>('current_user_id');
        
        if (authToken && userId) {
          // User is authenticated
          setIsAuthenticated(true);
          logger.info('User is authenticated');
        } else {
          // User needs to login
          setIsAuthenticated(false);
          logger.info('User needs to login');
        }
        
        setIsInitialized(true);
      } catch (error) {
        logger.error('Failed to initialize app', error);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <SafeAreaProvider>
        <View style={styles.centerContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen 
            name="Login" 
            component={LoginWrapper}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Registration" 
            component={RegistrationWrapper}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardWrapper}
            options={{ title: 'MADHAV AI Dashboard' }}
          />
          <Stack.Screen 
            name="Weather" 
            component={WeatherScreen}
            options={{ title: 'Weather Forecast' }}
          />
          <Stack.Screen 
            name="Market" 
            component={MarketScreen}
            options={{ title: 'Market Prices' }}
          />
          <Stack.Screen 
            name="Schemes" 
            component={SchemesScreen}
            options={{ title: 'Government Schemes' }}
          />
          <Stack.Screen 
            name="Training" 
            component={TrainingScreen}
            options={{ title: 'Training & Learning' }}
          />
          <Stack.Screen 
            name="Recommendations" 
            component={RecommendationsScreen}
            options={{ title: 'Recommendations' }}
          />
          <Stack.Screen 
            name="SoilHealth" 
            component={SoilHealthScreen}
            options={{ title: 'Soil Health' }}
          />
          <Stack.Screen 
            name="Alerts" 
            component={AlertsScreen}
            options={{ title: 'Alerts & Reminders' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="CropPlanner" 
            component={PlaceholderScreen}
            initialParams={{ title: 'Crop Planner' }}
            options={{ title: 'Crop Planner' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = {
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

export default App;
