/**
 * MarketPricesWidget
 * Displays recent market prices on dashboard
 * Requirement: 14.4
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {MarketPrice} from '../../types/market.types';
import {useTranslation} from '../../hooks/useTranslation';

interface MarketPricesWidgetProps {
  prices: MarketPrice[];
  navigation: any;
}

const MarketPricesWidget: React.FC<MarketPricesWidgetProps> = ({
  prices,
  navigation,
}) => {
  const {translate} = useTranslation();

  const renderPrice = ({item}: {item: MarketPrice}) => (
    <View style={styles.priceItem}>
      <View style={styles.priceInfo}>
        <Text style={styles.cropName}>{item.crop}</Text>
        <Text style={styles.mandiName}>{item.mandiName}</Text>
      </View>
      <Text style={styles.price}>₹{item.price.modal}/q</Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Market')}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.icon}>💰</Text>
        <Text style={styles.title}>{translate('dashboard.market_prices')}</Text>
      </View>

      <FlatList
        data={prices.slice(0, 3)}
        renderItem={renderPrice}
        keyExtractor={(item, index) => `${item.crop}-${index}`}
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
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  priceInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mandiName: {
    fontSize: 12,
    color: '#999',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  viewMore: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default MarketPricesWidget;
