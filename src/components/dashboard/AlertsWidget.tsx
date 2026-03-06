/**
 * AlertsWidget
 * Displays upcoming alerts on dashboard
 * Requirement: 14.2
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {Alert} from '../../types/alert.types';
import {useTranslation} from '../../hooks/useTranslation';

interface AlertsWidgetProps {
  alerts: Alert[];
  navigation: any;
}

const AlertsWidget: React.FC<AlertsWidgetProps> = ({alerts, navigation}) => {
  const {translate} = useTranslation();

  const navigateToAlerts = () => {
    navigation.navigate('Alerts');
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#F44336';
      case 'high':
        return '#FF9800';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getAlertIcon = (type: string): string => {
    switch (type) {
      case 'weather':
        return '🌧️';
      case 'sowing':
        return '🌱';
      case 'fertilizer':
        return '🧪';
      case 'irrigation':
        return '💧';
      case 'pest_control':
        return '🐛';
      case 'harvest':
        return '🌾';
      case 'scheme':
        return '📄';
      case 'market_price':
        return '💰';
      default:
        return '🔔';
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffTime = alertDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return translate('common.today');
    } else if (diffDays === 1) {
      return translate('common.tomorrow');
    } else {
      return `${diffDays} ${translate('common.days')}`;
    }
  };

  const renderAlert = ({item}: {item: Alert}) => (
    <View style={styles.alertItem}>
      <View style={styles.alertIcon}>
        <Text style={styles.alertIconText}>{getAlertIcon(item.type)}</Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.alertTime}>{formatDate(item.scheduledTime)}</Text>
      </View>
      <View
        style={[
          styles.priorityIndicator,
          {backgroundColor: getPriorityColor(item.priority)},
        ]}
      />
    </View>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToAlerts}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>{translate('dashboard.alerts')}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{alerts.length}</Text>
        </View>
      </View>

      <FlatList
        data={alerts.slice(0, 3)}
        renderItem={renderAlert}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />

      {alerts.length > 3 && (
        <Text style={styles.viewMore}>
          {translate('common.view_all')} ({alerts.length}) →
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertIconText: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  viewMore: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default AlertsWidget;
