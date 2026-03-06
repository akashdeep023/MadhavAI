/**
 * CropStatusWidget
 * Displays current crop status on dashboard
 * Requirement: 14.3
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {CropStatus} from '../../types/dashboard.types';
import {useTranslation} from '../../hooks/useTranslation';

interface CropStatusWidgetProps {
  cropStatus: CropStatus[];
  navigation: any;
}

const CropStatusWidget: React.FC<CropStatusWidgetProps> = ({
  cropStatus,
  navigation,
}) => {
  const {translate} = useTranslation();

  const navigateToCropPlanner = () => {
    navigation.navigate('CropPlanner');
  };

  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'good':
        return '#4CAF50';
      case 'fair':
        return '#FFC107';
      case 'poor':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getHealthIcon = (health: string): string => {
    switch (health) {
      case 'good':
        return '✅';
      case 'fair':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '❓';
    }
  };

  const renderCrop = ({item}: {item: CropStatus}) => (
    <View style={styles.cropItem}>
      <View style={styles.cropHeader}>
        <Text style={styles.cropName}>{item.cropName}</Text>
        <View style={styles.healthBadge}>
          <Text style={styles.healthIcon}>{getHealthIcon(item.health)}</Text>
          <Text
            style={[styles.healthText, {color: getHealthColor(item.health)}]}>
            {translate(`crop.health.${item.health}`)}
          </Text>
        </View>
      </View>

      <View style={styles.cropDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {translate('crop.stage')}:
          </Text>
          <Text style={styles.detailValue}>{item.stage}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {translate('crop.area')}:
          </Text>
          <Text style={styles.detailValue}>{item.farmArea} acres</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {translate('crop.next_activity')}:
          </Text>
          <Text style={styles.detailValue}>
            {item.nextActivity} ({item.daysToNextActivity}{' '}
            {translate('common.days')})
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToCropPlanner}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.icon}>🌾</Text>
        <Text style={styles.title}>{translate('dashboard.crop_status')}</Text>
      </View>

      <FlatList
        data={cropStatus}
        renderItem={renderCrop}
        keyExtractor={(item, index) => `${item.cropName}-${index}`}
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
  cropItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cropDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  viewMore: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default CropStatusWidget;
