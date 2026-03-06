/**
 * UpcomingActivitiesWidget
 * Displays upcoming activities timeline
 * Requirement: 14.2
 */

import React from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {Alert} from '../../types/alert.types';
import {useTranslation} from '../../hooks/useTranslation';

interface UpcomingActivitiesWidgetProps {
  alerts: Alert[];
  navigation: any;
}

const UpcomingActivitiesWidget: React.FC<UpcomingActivitiesWidgetProps> = ({
  alerts,
}) => {
  const {translate} = useTranslation();

  const formatDate = (date: Date): string => {
    const alertDate = new Date(date);
    return alertDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getActivityIcon = (type: string): string => {
    const iconMap: {[key: string]: string} = {
      sowing: '🌱',
      fertilizer: '🧪',
      irrigation: '💧',
      pest_control: '🐛',
      harvest: '🌾',
      weather: '🌧️',
      scheme: '📄',
      market_price: '💰',
    };
    return iconMap[type] || '📅';
  };

  const renderActivity = ({item, index}: {item: Alert; index: number}) => (
    <View style={styles.activityItem}>
      <View style={styles.timeline}>
        <View style={styles.timelineDot} />
        {index < alerts.length - 1 && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityIcon}>{getActivityIcon(item.type)}</Text>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityDate}>
              {formatDate(item.scheduledTime)}
            </Text>
          </View>
        </View>
        <Text style={styles.activityDescription} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
    </View>
  );

  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>📅</Text>
        <Text style={styles.title}>
          {translate('dashboard.upcoming_activities')}
        </Text>
      </View>

      <FlatList
        data={alerts.slice(0, 5)}
        renderItem={renderActivity}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    </View>
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
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeline: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginLeft: 28,
  },
});

export default UpcomingActivitiesWidget;
