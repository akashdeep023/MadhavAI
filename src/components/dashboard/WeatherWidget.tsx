/**
 * WeatherWidget
 * Displays current weather conditions on dashboard
 * Requirement: 14.1
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {DailyForecast} from '../../types/weather.types';
import {useTranslation} from '../../hooks/useTranslation';

interface WeatherWidgetProps {
  weather: DailyForecast;
  navigation: any;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({weather, navigation}) => {
  const {translate} = useTranslation();

  const navigateToWeather = () => {
    navigation.navigate('Weather');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToWeather}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.icon}>🌤️</Text>
        <Text style={styles.title}>{translate('dashboard.weather')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text style={styles.temperature}>{weather.temperature.current}°C</Text>
          <Text style={styles.conditions}>{weather.description}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              {translate('weather.humidity')}
            </Text>
            <Text style={styles.detailValue}>{weather.humidity}%</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              {translate('weather.wind')}
            </Text>
            <Text style={styles.detailValue}>{weather.wind.speed} km/h</Text>
          </View>
        </View>
      </View>

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
  content: {
    marginBottom: 12,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  conditions: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewMore: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'right',
  },
});

export default WeatherWidget;
