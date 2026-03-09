/**
 * Market Price Display Component
 * Shows market prices, trends, and selling recommendations
 * Requirements: 8.1, 8.4, 8.5
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { marketService } from '../services/market/MarketService';
import { trendAnalyzer } from '../services/market/TrendAnalyzer';
import { sellingAdvisor } from '../services/market/SellingAdvisor';
import { MarketPrice, Mandi, PriceTrend } from '../types/market.types';
import { logger } from '../utils/logger';

interface MarketPriceDisplayProps {
  latitude: number;
  longitude: number;
  crops?: string[];
  radiusKm?: number;
}

export const MarketPriceDisplay: React.FC<MarketPriceDisplayProps> = ({
  latitude,
  longitude,
  crops,
  radiusKm = 50,
}) => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [trend, setTrend] = useState<PriceTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, crops, radiusKm]);

  useEffect(() => {
    if (selectedCrop && prices.length > 0) {
      loadTrendData(selectedCrop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, prices]);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pricesData, mandisData] = await Promise.all([
        marketService.getPrices(latitude, longitude, crops, radiusKm),
        marketService.getNearbyMandis(latitude, longitude, radiusKm),
      ]);

      setPrices(pricesData);
      setMandis(mandisData);

      if (pricesData.length > 0 && !selectedCrop) {
        setSelectedCrop(pricesData[0].crop);
      }

      logger.info('Market data loaded successfully');
    } catch (err) {
      setError('Failed to load market data');
      logger.error('Error loading market data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async (crop: string) => {
    try {
      const trendData = trendAnalyzer.analyzeTrend(prices, crop, undefined, 30);
      setTrend(trendData);
    } catch (err) {
      logger.error('Error loading trend data', err);
    }
  };

  const getUniqueCrops = (): string[] => {
    const cropSet = new Set(prices.map((p) => p.crop));
    return Array.from(cropSet);
  };

  const getPricesForCrop = (crop: string): MarketPrice[] => {
    return prices.filter((p) => p.crop === crop);
  };

  const getTrendIcon = (trendType: 'rising' | 'falling' | 'stable'): string => {
    switch (trendType) {
      case 'rising':
        return '📈';
      case 'falling':
        return '📉';
      case 'stable':
        return '➡️';
    }
  };

  const getTrendColor = (trendType: 'rising' | 'falling' | 'stable'): string => {
    switch (trendType) {
      case 'rising':
        return '#4CAF50';
      case 'falling':
        return '#F44336';
      case 'stable':
        return '#FF9800';
    }
  };

  const formatPrice = (price: number): string => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(1)} km`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading market prices...</Text>
      </View>
    );
  }

  if (error || prices.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'No market data available'}</Text>
      </View>
    );
  }

  const uniqueCrops = getUniqueCrops();
  const cropPrices = selectedCrop ? getPricesForCrop(selectedCrop) : [];
  const recommendation = selectedCrop
    ? sellingAdvisor.getRecommendation(prices, selectedCrop)
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Crop Selector */}
      <View style={styles.cropSelector}>
        <Text style={styles.sectionTitle}>Select Crop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {uniqueCrops.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[styles.cropButton, selectedCrop === crop && styles.cropButtonActive]}
              onPress={() => setSelectedCrop(crop)}
            >
              <Text
                style={[styles.cropButtonText, selectedCrop === crop && styles.cropButtonTextActive]}
              >
                {crop}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Selling Recommendation */}
      {recommendation && (
        <View
          style={[
            styles.recommendationCard,
            recommendation.shouldSell ? styles.recommendationSell : styles.recommendationHold,
          ]}
        >
          <Text style={styles.recommendationTitle}>
            {recommendation.shouldSell ? '✅ SELL NOW' : '⏳ HOLD'}
          </Text>
          <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
          <View style={styles.recommendationDetails}>
            <View style={styles.recommendationRow}>
              <Text style={styles.recommendationLabel}>Current Price:</Text>
              <Text style={styles.recommendationValue}>
                {formatPrice(recommendation.currentPrice)}
              </Text>
            </View>
            <View style={styles.recommendationRow}>
              <Text style={styles.recommendationLabel}>30-Day Average:</Text>
              <Text style={styles.recommendationValue}>
                {formatPrice(recommendation.averagePrice)}
              </Text>
            </View>
            <View style={styles.recommendationRow}>
              <Text style={styles.recommendationLabel}>Price Advantage:</Text>
              <Text
                style={[
                  styles.recommendationValue,
                  styles.priceAdvantageColor,
                ]}
              >
                {recommendation.priceAdvantage > 0 ? '+' : ''}
                {recommendation.priceAdvantage.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.bestMandiCard}>
            <Text style={styles.bestMandiTitle}>Best Mandi</Text>
            <Text style={styles.bestMandiName}>{recommendation.bestMandi.name}</Text>
            <Text style={styles.bestMandiLocation}>{recommendation.bestMandi.location}</Text>
            <Text style={styles.bestMandiPrice}>{formatPrice(recommendation.bestMandi.price)}</Text>
          </View>
        </View>
      )}

      {/* Price Trend */}
      {trend && (
        <View style={styles.trendCard}>
          <Text style={styles.sectionTitle}>30-Day Price Trend</Text>
          <View style={styles.trendHeader}>
            <Text style={styles.trendIcon}>{getTrendIcon(trend.trend)}</Text>
            <View style={styles.trendInfo}>
              <Text style={[styles.trendType, { color: getTrendColor(trend.trend) }]}>
                {trend.trend.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.trendChange,
                  styles.trendChangeColor,
                ]}
              >
                {trend.changePercent > 0 ? '+' : ''}
                {trend.changePercent.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.trendStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>{formatPrice(trend.average)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Data Points</Text>
              <Text style={styles.statValue}>{trend.prices.length}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Current Prices */}
      <View style={styles.pricesSection}>
        <Text style={styles.sectionTitle}>Current Prices</Text>
        {cropPrices.map((price, index) => (
          <View key={index} style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <Text style={styles.mandiName}>{price.mandiName}</Text>
              <Text style={styles.priceModal}>{formatPrice(price.price.modal)}</Text>
            </View>
            <Text style={styles.mandiLocation}>
              {price.mandiLocation.market}, {price.mandiLocation.district}
            </Text>
            <View style={styles.priceRange}>
              <Text style={styles.priceRangeText}>
                Min: {formatPrice(price.price.min)} | Max: {formatPrice(price.price.max)}
              </Text>
            </View>
            <Text style={styles.priceDate}>
              {new Date(price.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        ))}
      </View>

      {/* Nearby Mandis */}
      <View style={styles.mandisSection}>
        <Text style={styles.sectionTitle}>Nearby Mandis</Text>
        {mandis.map((mandi) => (
          <View key={mandi.id} style={styles.mandiCard}>
            <View style={styles.mandiHeader}>
              <Text style={styles.mandiCardName}>{mandi.name}</Text>
              {mandi.distance && (
                <Text style={styles.mandiDistance}>{formatDistance(mandi.distance)}</Text>
              )}
            </View>
            <Text style={styles.mandiCardLocation}>
              {mandi.location.market}, {mandi.location.district}, {mandi.location.state}
            </Text>
            {mandi.facilities.length > 0 && (
              <View style={styles.facilitiesContainer}>
                {mandi.facilities.map((facility, index) => (
                  <View key={index} style={styles.facilityTag}>
                    <Text style={styles.facilityText}>{facility}</Text>
                  </View>
                ))}
              </View>
            )}
            {mandi.operatingHours && (
              <Text style={styles.operatingHours}>⏰ {mandi.operatingHours}</Text>
            )}
          </View>
        ))}
      </View>
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
    color: '#F44336',
    textAlign: 'center',
  },
  cropSelector: {
    padding: 16,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cropButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 10,
  },
  cropButtonActive: {
    backgroundColor: '#4CAF50',
  },
  cropButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cropButtonTextActive: {
    color: '#FFF',
  },
  recommendationCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  recommendationSell: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  recommendationHold: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  recommendationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recommendationReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  recommendationDetails: {
    marginBottom: 16,
  },
  recommendationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recommendationLabel: {
    fontSize: 14,
    color: '#666',
  },
  recommendationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  bestMandiCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
  },
  bestMandiTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  bestMandiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bestMandiLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bestMandiPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  trendCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  trendInfo: {
    flex: 1,
  },
  trendType: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trendChange: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pricesSection: {
    margin: 16,
    marginTop: 0,
  },
  priceCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mandiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  priceModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  mandiLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceRange: {
    marginBottom: 8,
  },
  priceRangeText: {
    fontSize: 12,
    color: '#666',
  },
  priceDate: {
    fontSize: 11,
    color: '#999',
  },
  mandisSection: {
    margin: 16,
    marginTop: 0,
  },
  mandiCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  mandiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mandiCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  mandiDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  mandiCardLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  facilityTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  facilityText: {
    fontSize: 11,
    color: '#1976D2',
  },
  operatingHours: {
    fontSize: 12,
    color: '#666',
  },
  priceAdvantageColor: {
    color: '#4CAF50',
  },
  trendChangeColor: {
    color: '#4CAF50',
  },
});
