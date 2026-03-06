/**
 * QuickActionsWidget
 * Displays quick access buttons for major features
 * Requirement: 14.6, 14.7
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {QuickAction} from '../../types/dashboard.types';
import {useTranslation} from '../../hooks/useTranslation';

interface QuickActionsWidgetProps {
  actions: QuickAction[];
  navigation: any;
}

const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  actions,
  navigation,
}) => {
  const {translate} = useTranslation();

  const renderAction = ({item}: {item: QuickAction}) => (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={() => navigation.navigate(item.route)}
      activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Text style={styles.actionIcon}>{getIconEmoji(item.icon)}</Text>
      </View>
      <Text style={styles.actionTitle} numberOfLines={2}>
        {translate(`features.${item.id}`)}
      </Text>
      {item.badge && item.badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getIconEmoji = (iconName: string): string => {
    const iconMap: {[key: string]: string} = {
      'weather-partly-cloudy': '🌤️',
      'file-document': '📄',
      'currency-inr': '💰',
      school: '🎓',
      lightbulb: '💡',
      terrain: '🌍',
      flask: '🧪',
      seed: '🌱',
      'calendar-check': '📅',
    };
    return iconMap[iconName] || '📱';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{translate('dashboard.quick_actions')}</Text>
      <FlatList
        data={actions}
        renderItem={renderAction}
        keyExtractor={item => item.id}
        numColumns={4}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
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
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 4,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default QuickActionsWidget;
