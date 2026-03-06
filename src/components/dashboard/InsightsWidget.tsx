/**
 * InsightsWidget
 * Displays personalized insights based on season and crop stage
 * Requirement: 14.5, 14.7
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {Insight} from '../../types/dashboard.types';
import {useTranslation} from '../../hooks/useTranslation';

interface InsightsWidgetProps {
  insights: Insight[];
  navigation: any;
}

const InsightsWidget: React.FC<InsightsWidgetProps> = ({
  insights,
  navigation,
}) => {
  const {translate} = useTranslation();

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getTypeIcon = (type: string): string => {
    const iconMap: {[key: string]: string} = {
      seasonal: '🌱',
      harvest: '🌾',
      weather: '🌤️',
      price: '💰',
      alert: '🔔',
      'crop-care': '🌿',
      scheme: '📄',
    };
    return iconMap[type] || '💡';
  };

  const renderInsight = ({item}: {item: Insight}) => (
    <TouchableOpacity
      style={[
        styles.insightItem,
        {borderLeftColor: getPriorityColor(item.priority)},
      ]}
      onPress={() => item.actionUrl && navigation.navigate(item.actionUrl)}
      activeOpacity={item.actionable ? 0.7 : 1}
      disabled={!item.actionable}>
      <Text style={styles.insightIcon}>{getTypeIcon(item.type)}</Text>
      <View style={styles.insightContent}>
        <Text style={styles.insightMessage}>{item.message}</Text>
        {item.actionable && (
          <Text style={styles.actionHint}>
            {translate('common.tap_to_view')} →
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.title}>{translate('dashboard.insights')}</Text>
      </View>

      <FlatList
        data={insights.slice(0, 3)}
        renderItem={renderInsight}
        keyExtractor={(item, index) => `${item.type}-${index}`}
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
  },
  insightItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionHint: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
});

export default InsightsWidget;
