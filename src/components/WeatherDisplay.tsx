/**
 * Weather Display Component
 * Shows 7-day weather forecast with farming advice
 * Requirements: 6.1, 6.4
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { weatherService } from '../services/weather/WeatherService';
import { weatherAdvisor } from '../services/weather/WeatherAdvisor';
import { WeatherForecast } from '../types/weather.types';
import { logger } from '../utils/logger';

interface WeatherDisplayProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  showAdvice?: boolean;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  latitude,
  longitude,
  locationName,
  showAdvice = true,
}) => {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        const data = await weatherService.getForecast(latitude, longitude);
        setForecast(data);
        logger.info('Weather data loaded successfully');
      } catch {
        // API failed, use mock data for demo
        logger.info('Weather API not available, using mock data');
        const mockForecast = generateMockForecast(latitude, longitude);
        setForecast(mockForecast);
      }
    } catch (err) {
      setError('Failed to load weather data');
      logger.error('Error loading weather', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMockForecast = (lat: number, lon: number): WeatherForecast => {
    const today = new Date();
    const dailyForecasts = [];
    
    // Generate varied weather conditions for realistic forecast
    const conditions: Array<'clear' | 'partly_cloudy' | 'cloudy' | 'rain' | 'drizzle'> = ['clear', 'partly_cloudy', 'cloudy', 'rain', 'drizzle'];
    const descriptions = ['Clear Sky', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Drizzle'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const conditionIndex = Math.floor(Math.random() * conditions.length);
      const condition = conditions[conditionIndex];
      const hasRain = condition.includes('rain') || condition === 'drizzle';
      
      // Calculate sunrise and sunset times
      const sunrise = new Date(date);
      sunrise.setHours(6, 0, 0, 0);
      const sunset = new Date(date);
      sunset.setHours(18, 30, 0, 0);
      
      const tempCurrent = 23 + Math.random() * 5;
      const tempMin = 18 + Math.random() * 5;
      const tempMax = 28 + Math.random() * 7;
      
      dailyForecasts.push({
        date: date,
        condition: condition,
        description: descriptions[conditionIndex],
        temperature: {
          min: tempMin,
          max: tempMax,
          current: tempCurrent,
          feelsLike: tempCurrent + (hasRain ? -2 : 1),
        },
        precipitation: {
          probability: hasRain ? 60 + Math.random() * 30 : 5 + Math.random() * 15,
          amount: hasRain ? 5 + Math.random() * 15 : 0,
          type: (hasRain ? (condition === 'rain' ? 'rain' : 'rain') : 'none') as 'none' | 'rain' | 'snow' | 'hail',
        },
        humidity: hasRain ? 70 + Math.random() * 20 : 50 + Math.random() * 20,
        wind: {
          speed: 10 + Math.random() * 15,
          direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
        },
        uvIndex: conditions[conditionIndex] === 'clear' ? 8 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 4),
        sunrise: sunrise,
        sunset: sunset,
      });
    }

    return {
      location: {
        name: locationName || 'Demo Location',
        latitude: lat,
        longitude: lon,
      },
      current: dailyForecasts[0],
      daily: dailyForecasts,
      alerts: [],
      lastUpdated: new Date(),
      source: 'Demo Weather Data',
    };
  };

  const getWeatherIcon = (condition: string): string => {
    const icons: Record<string, string> = {
      clear: '☀️',
      partly_cloudy: '⛅',
      cloudy: '☁️',
      rain: '🌧️',
      heavy_rain: '⛈️',
      thunderstorm: '⚡',
      drizzle: '🌦️',
      fog: '🌫️',
      snow: '❄️',
      hail: '🌨️',
    };
    return icons[condition] || '🌤️';
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading weather...</Text>
      </View>
    );
  }

  if (error || !forecast) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'No weather data available'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Current Weather */}
      <View style={styles.currentWeather}>
        <Text style={styles.locationText}>📍 {forecast.location.name}</Text>
        <View style={styles.currentMainInfo}>
          <View style={styles.temperatureSection}>
            <Text style={styles.weatherIcon}>{getWeatherIcon(forecast.current.condition)}</Text>
            <View style={styles.tempContainer}>
              <Text style={styles.temperature}>{Math.round(forecast.current.temperature.current)}°C</Text>
              <Text style={styles.condition}>{forecast.current.description}</Text>
              <Text style={styles.feelsLike}>
                Feels like {Math.round(forecast.current.temperature.feelsLike)}°
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>🌡️</Text>
              <Text style={styles.detailLabel}>High/Low</Text>
              <Text style={styles.detailValue}>
                {Math.round(forecast.current.temperature.max)}° / {Math.round(forecast.current.temperature.min)}°
              </Text>
            </View>
            
            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>💧</Text>
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>{Math.round(forecast.current.humidity)}%</Text>
            </View>
            
            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>💨</Text>
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>
                {Math.round(forecast.current.wind.speed)} km/h
              </Text>
            </View>
            
            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>☀️</Text>
              <Text style={styles.detailLabel}>UV Index</Text>
              <Text style={styles.detailValue}>{forecast.current.uvIndex}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Farming Advice for Current Weather */}
      {showAdvice && (
        <View style={styles.adviceContainer}>
          <Text style={styles.adviceTitle}>Farming Advice</Text>
          {weatherAdvisor.getAdviceForForecast(forecast.current).advice.map((advice, index) => (
            <Text key={index} style={styles.adviceText}>
              • {advice}
            </Text>
          ))}
        </View>
      )}

      {/* 7-Day Forecast */}
      <View style={styles.forecastContainer}>
        <Text style={styles.sectionTitle}>7-Day Forecast</Text>
        {forecast.daily.map((day, index) => {
          const advice = weatherAdvisor.getAdviceForForecast(day);
          return (
            <View key={index} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                <Text style={styles.dayIcon}>{getWeatherIcon(day.condition)}</Text>
                <Text style={styles.dayTemp}>
                  {Math.round(day.temperature.max)}° / {Math.round(day.temperature.min)}°
                </Text>
              </View>
              <Text style={styles.dayDescription}>{day.description}</Text>
              {showAdvice && advice.priority !== 'low' && (
                <View style={styles.dayAdvice}>
                  <Text style={styles.dayAdviceText}>⚠️ {advice.advice[0]}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Alerts */}
      {forecast.alerts.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.sectionTitle}>Weather Alerts</Text>
          {forecast.alerts.map((alert) => (
            <View key={alert.id} style={[styles.alertCard, styles[`alert_${alert.severity}`]]}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDescription}>{alert.description}</Text>
              <Text style={styles.alertAdvice}>💡 {alert.farmingAdvice}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.lastUpdated}>
        Last updated: {new Date(forecast.lastUpdated).toLocaleString()}
      </Text>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  currentWeather: {
    backgroundColor: '#4A90E2',
    padding: 24,
    borderRadius: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  currentMainInfo: {
    gap: 20,
  },
  temperatureSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingLeft: 30
  },
  weatherIcon: {
    fontSize: 80,
    marginRight: 20,
  },
  tempContainer: {
    alignItems: 'flex-start',
  },
  temperature: {
    fontSize: 64,
    color: '#FFF',
    fontWeight: 'bold',
    lineHeight: 70,
  },
  condition: {
    fontSize: 18,
    color: '#FFF',
    opacity: 0.95,
    marginTop: 4,  flexWrap: 'wrap',
  width: '95%'
  },
  feelsLike: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  adviceContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  adviceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  forecastContainer: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dayIcon: {
    fontSize: 32,
    marginHorizontal: 10,
  },
  dayTemp: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dayAdvice: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  dayAdviceText: {
    fontSize: 13,
    color: '#856404',
  },
  alertsContainer: {
    margin: 16,
    marginTop: 0,
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  alert_low: {
    backgroundColor: '#E3F2FD',
  },
  alert_medium: {
    backgroundColor: '#FFF3CD',
  },
  alert_high: {
    backgroundColor: '#FFE5E5',
  },
  alert_severe: {
    backgroundColor: '#FFCDD2',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertAdvice: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
});
