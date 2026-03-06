/**
 * RecommendationsWidget
 * Displays personalized recommendations on dashboard
 * Requirement: 14.5
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {RecommendationSummary} from '../../types/dashboard.types';
import {useTranslation} from '../../hooks/useTranslation';

interface RecommendationsWidgetProps {
  recommendations: RecommendationSummary[];
  navigation: any;
}

const RecommendationsWidget: React.FC<RecommendationsWidgetProps> = ({
  recommendations,
  navigation,
}) => {
  const {translate} = useTranslation();

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'crop':
        return '🌾';
      case 'fertilizer':
        return '🧪';
      case 'seed':
        return '🌱';
      case 'soil':
        return '🌍';
      default:
        return '💡';
    }
  };

  const renderRecommendation = ({item}: {item: RecommendationSummary}) => (
    <View style={styles.recItem}>
      <Text style={styles.recIcon}>{getTypeIcon(item.type)}</Text>
      <View style={styles.recContent}>
        <Text style={styles.recTitle}>{item.title}</Text>
        <Text style={styles.recSummary} numberOfLines={2}>
          {item.summary}
        </Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {Math.round(item.confidence * 100)}% {translate('common.confidence')}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Recommendations')}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.title}>{translate('dashboard.recommendations')}</Text>
      </View>

      <FlatList
        data={recommendations.slice(0, 2)}
        renderItem={renderRecommendation}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        scrollEnabled={false}
      />

      <Text style={styles.viewMore}>{translate('common.view_more')} →</Text>
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
  },
  recItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recSummary: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  viewMore: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default RecommendationsWidget;
