/**
 * DashboardScreen
 * Main dashboard screen with all-in-one farmer guidance
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.10
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {DashboardData} from '../types/dashboard.types';
import {DashboardService} from '../services/dashboard/DashboardService';
import {
  WeatherWidget,
  AlertsWidget,
  CropStatusWidget,
  MarketPricesWidget,
  RecommendationsWidget,
  QuickActionsWidget,
  InsightsWidget,
  UpcomingActivitiesWidget,
} from '../components/dashboard';
import {useVoice} from '../hooks/useVoice';
import {useTranslation} from '../hooks/useTranslation';

interface DashboardScreenProps {
  userId: string;
  dashboardService: DashboardService;
  navigation: any;
}

/**
 * Main dashboard screen component
 */
const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userId,
  dashboardService,
  navigation,
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {speak, isAvailable: voiceSupported} = useVoice();
  const {translate} = useTranslation();

  /**
   * Load dashboard data
   */
  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await dashboardService.getDashboardData(userId);
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(translate('dashboard.error.load_failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, dashboardService, translate]);

  /**
   * Refresh dashboard
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
  }, [loadDashboard]);

  /**
   * Speak dashboard summary
   * Requirement: 14.10
   */
  const speakDashboardSummary = useCallback(async () => {
    if (!dashboardData || !voiceSupported) {
      return;
    }

    const summary = generateDashboardSummary(dashboardData);
    await speak(summary);
  }, [dashboardData, voiceSupported, speak]);

  /**
   * Generate dashboard summary text
   */
  const generateDashboardSummary = (data: DashboardData): string => {
    const parts: string[] = [];

    // Weather
    if (data.weather) {
      parts.push(
        `${translate('dashboard.weather')}: ${data.weather.temperature.current}°C, ${data.weather.description}`,
      );
    }

    // Alerts
    if (data.upcomingAlerts.length > 0) {
      parts.push(
        `${translate('dashboard.alerts')}: ${data.upcomingAlerts.length} ${translate('dashboard.pending')}`,
      );
    }

    // Crop status
    if (data.cropStatus.length > 0) {
      const crop = data.cropStatus[0];
      parts.push(
        `${crop.cropName}: ${crop.stage}, ${translate('dashboard.next_activity')} ${crop.nextActivity}`,
      );
    }

    // Insights
    if (data.insights.length > 0) {
      parts.push(data.insights[0].message);
    }

    return parts.join('. ');
  };

  /**
   * Load dashboard on mount
   */
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {translate('dashboard.loading')}
        </Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryButtonText}>
            {translate('common.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Render dashboard
   */
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header with voice button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {translate('dashboard.title')}
        </Text>
        {voiceSupported && (
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={speakDashboardSummary}>
            <Text style={styles.voiceButtonText}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>

      {dashboardData && (
        <>
          {/* Quick Actions - Requirement 14.6 */}
          <QuickActionsWidget
            actions={dashboardData.quickActions}
            navigation={navigation}
          />

          {/* Insights - Requirement 14.5, 14.7 */}
          {dashboardData.insights.length > 0 && (
            <InsightsWidget
              insights={dashboardData.insights}
              navigation={navigation}
            />
          )}

          {/* Weather - Requirement 14.1 */}
          <WeatherWidget
            weather={dashboardData.weather}
            navigation={navigation}
          />

          {/* Alerts - Requirement 14.2 */}
          {dashboardData.upcomingAlerts.length > 0 && (
            <AlertsWidget
              alerts={dashboardData.upcomingAlerts}
              navigation={navigation}
            />
          )}

          {/* Upcoming Activities Timeline */}
          <UpcomingActivitiesWidget
            alerts={dashboardData.upcomingAlerts}
            navigation={navigation}
          />

          {/* Crop Status - Requirement 14.3 */}
          {dashboardData.cropStatus.length > 0 && (
            <CropStatusWidget
              cropStatus={dashboardData.cropStatus}
              navigation={navigation}
            />
          )}

          {/* Market Prices - Requirement 14.4 */}
          {dashboardData.marketPrices.length > 0 && (
            <MarketPricesWidget
              prices={dashboardData.marketPrices}
              navigation={navigation}
            />
          )}

          {/* Recommendations - Requirement 14.5 */}
          {dashboardData.recommendations.length > 0 && (
            <RecommendationsWidget
              recommendations={dashboardData.recommendations}
              navigation={navigation}
            />
          )}

          {/* Last updated */}
          <View style={styles.footer}>
            <Text style={styles.lastUpdated}>
              {translate('dashboard.last_updated')}:{' '}
              {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  voiceButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  voiceButtonText: {
    fontSize: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
  },
});

export default DashboardScreen;
