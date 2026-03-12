/**
 * AccessibleDashboardExample
 * Example implementation showing how to use accessibility components
 * This demonstrates the integration of all Task 22 components
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import {
  AccessibleButton,
  StatusIndicator,
  IconNavigationCard,
  SimpleTextInput,
} from '../components/accessibility';
import { ContextualHelp } from '../components/onboarding';
import { deviceCapabilities, batteryOptimizer, memoryManager } from '../utils/performance';

interface AccessibleDashboardExampleProps {
  navigation: any;
}

/**
 * Example dashboard using accessible components
 * Optimized for low-literacy users and low-end devices
 */
const AccessibleDashboardExample: React.FC<AccessibleDashboardExampleProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLowBatteryMode, setIsLowBatteryMode] = useState(false);

  useEffect(() => {
    // Initialize performance optimizations based on device
    if (deviceCapabilities.isLowEndDevice) {
      batteryOptimizer.enableLowBatteryMode();
      memoryManager.enableLowMemoryMode();
      setIsLowBatteryMode(true);
    }

    // Setup memory warning handler
    memoryManager.onMemoryWarning(() => {
      console.warn('Memory limit approaching, clearing cache...');
      memoryManager.clearCache();
    });
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Header with device info */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accessible Dashboard</Text>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceInfoText}>Device: {deviceCapabilities.tier.toUpperCase()}</Text>
          {isLowBatteryMode && (
            <StatusIndicator type="info" message="Battery saver on" size="small" />
          )}
        </View>
      </View>

      {/* Status indicators section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Farm Status</Text>
          <ContextualHelp
            title="Farm Status"
            content="These indicators show the current health and status of your farm. Green means good, yellow means attention needed, red means urgent action required."
          />
        </View>

        <StatusIndicator type="success" message="Crops are healthy" size="large" />

        <View style={styles.spacer} />

        <StatusIndicator type="warning" message="Irrigation needed in 2 days" size="large" />

        <View style={styles.spacer} />

        <StatusIndicator type="info" message="Weather update available" size="large" />
      </View>

      {/* Search input with voice support */}
      <View style={styles.section}>
        <SimpleTextInput
          label="Search"
          icon="🔍"
          placeholder="Search crops, schemes, or advice..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          voiceSupported={true}
          onVoiceInput={() => {
            // Voice input handler would go here
            console.log('Voice input requested');
          }}
        />
      </View>

      {/* Navigation cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.cardGrid}>
          <IconNavigationCard
            icon="🌾"
            title="Crops"
            subtitle="View crops"
            onPress={() => navigation.navigate('Crops')}
            badge={3}
            accessibilityLabel="View your crops"
            accessibilityHint="Navigate to crops screen to see your crop information"
          />

          <IconNavigationCard
            icon="☀️"
            title="Weather"
            subtitle="7-day forecast"
            onPress={() => navigation.navigate('Weather')}
            accessibilityLabel="View weather forecast"
            accessibilityHint="Navigate to weather screen for 7-day forecast"
          />

          <IconNavigationCard
            icon="💰"
            title="Prices"
            subtitle="Market rates"
            onPress={() => navigation.navigate('Market')}
            badge={5}
            badgeColor="#FF9800"
            accessibilityLabel="View market prices"
            accessibilityHint="Navigate to market screen for current crop prices"
          />

          <IconNavigationCard
            icon="📋"
            title="Schemes"
            subtitle="Government aid"
            onPress={() => navigation.navigate('Schemes')}
            badge={2}
            badgeColor="#4CAF50"
            accessibilityLabel="View government schemes"
            accessibilityHint="Navigate to schemes screen for available subsidies"
          />

          <IconNavigationCard
            icon="🎓"
            title="Learn"
            subtitle="Tutorials"
            onPress={() => navigation.navigate('Training')}
            accessibilityLabel="View training lessons"
            accessibilityHint="Navigate to training screen for farming tutorials"
          />

          <IconNavigationCard
            icon="🌱"
            title="Soil"
            subtitle="Health check"
            onPress={() => navigation.navigate('SoilHealth')}
            accessibilityLabel="View soil health"
            accessibilityHint="Navigate to soil health screen for test results"
          />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Important Actions</Text>

        <AccessibleButton
          icon="💧"
          label="Schedule Irrigation"
          onPress={() => console.log('Schedule irrigation')}
          variant="primary"
          size="large"
          accessibilityLabel="Schedule irrigation"
          accessibilityHint="Set up irrigation schedule for your crops"
        />

        <View style={styles.spacer} />

        <AccessibleButton
          icon="🌾"
          label="Add New Crop"
          onPress={() => console.log('Add crop')}
          variant="success"
          size="large"
          accessibilityLabel="Add new crop"
          accessibilityHint="Register a new crop in your farm"
        />

        <View style={styles.spacer} />

        <AccessibleButton
          icon="📞"
          label="Contact Expert"
          onPress={() => console.log('Contact expert')}
          variant="secondary"
          size="large"
          accessibilityLabel="Contact agricultural expert"
          accessibilityHint="Get help from an agricultural expert"
        />
      </View>

      {/* Performance info (for demo purposes) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Optimization</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Device Tier: {deviceCapabilities.tier.toUpperCase()}</Text>
          <Text style={styles.infoText}>
            Screen: {deviceCapabilities.screenWidth}x{deviceCapabilities.screenHeight}
          </Text>
          <Text style={styles.infoText}>
            Image Quality: {Math.round(deviceCapabilities.recommendedImageQuality * 100)}%
          </Text>
          <Text style={styles.infoText}>
            Cache Size: {deviceCapabilities.recommendedCacheSize}MB
          </Text>
          <Text style={styles.infoText}>
            Animations: {deviceCapabilities.shouldEnableAnimations ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles.infoText}>
            Battery Mode: {isLowBatteryMode ? 'Low Power' : 'Normal'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceInfoText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  spacer: {
    height: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
});

export default AccessibleDashboardExample;
