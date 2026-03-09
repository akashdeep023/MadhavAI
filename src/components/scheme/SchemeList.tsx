/**
 * Scheme List Component
 * Requirements: 2.1, 2.5
 * 
 * Displays list of government schemes with filtering and search
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Scheme, SchemeCategory } from '../../types/scheme.types';
import { schemeService } from '../../services/scheme/SchemeService';

interface SchemeListProps {
  onSchemeSelect: (scheme: Scheme) => void;
  userEligibleOnly?: boolean;
}

export const SchemeList: React.FC<SchemeListProps> = ({
  onSchemeSelect,
  userEligibleOnly = false,
}) => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [filteredSchemes, setFilteredSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SchemeCategory | 'all'>('all');

  const categories: Array<SchemeCategory | 'all'> = [
    'all',
    'subsidy',
    'loan',
    'insurance',
    'training',
    'equipment',
    'irrigation',
  ];

  useEffect(() => {
    loadSchemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEligibleOnly]);

  useEffect(() => {
    filterSchemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemes, searchQuery, selectedCategory]);

  const loadSchemes = async () => {
    try {
      setLoading(true);
      // Fetch schemes from the service
      const fetchedSchemes = await schemeService.getAllSchemes();
      setSchemes(fetchedSchemes);
    } catch (error) {
      console.error('Error loading schemes:', error);
      // Set empty array on error
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSchemes = () => {
    let filtered = schemes;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(scheme => scheme.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        scheme =>
          scheme.name.toLowerCase().includes(query) ||
          scheme.description.toLowerCase().includes(query)
      );
    }

    setFilteredSchemes(filtered);
  };

  const renderSchemeCard = ({ item }: { item: Scheme }) => (
    <TouchableOpacity
      style={styles.schemeCard}
      onPress={() => onSchemeSelect(item)}
      accessibilityLabel={`View details for ${item.name}`}
      accessibilityRole="button"
    >
      <View style={styles.schemeHeader}>
        <Text style={styles.schemeName}>{item.name}</Text>
        <View style={[styles.categoryBadge, getCategoryColor(item.category)]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>

      <Text style={styles.schemeDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.schemeFooter}>
        <Text style={styles.benefitsLabel}>Benefits:</Text>
        <Text style={styles.benefitsText} numberOfLines={1}>
          {item.benefits.join(', ')}
        </Text>
      </View>

      {item.applicationDeadline && (
        <View style={styles.deadlineContainer}>
          <Text style={styles.deadlineText}>
            ⏰ Deadline: {new Date(item.applicationDeadline).toLocaleDateString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getCategoryColor = (category: SchemeCategory) => {
    const colors: Record<SchemeCategory, any> = {
      subsidy: { backgroundColor: '#E3F2FD' },
      loan: { backgroundColor: '#F3E5F5' },
      insurance: { backgroundColor: '#E8F5E9' },
      training: { backgroundColor: '#FFF3E0' },
      equipment: { backgroundColor: '#FCE4EC' },
      irrigation: { backgroundColor: '#E0F2F1' },
      organic_farming: { backgroundColor: '#F1F8E9' },
      crop_insurance: { backgroundColor: '#E8EAF6' },
      other: { backgroundColor: '#ECEFF1' },
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading schemes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search schemes..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search schemes"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
              accessibilityLabel={`Filter by ${item}`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Scheme List */}
      {filteredSchemes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No schemes found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSchemes}
          keyExtractor={item => item.id}
          renderItem={renderSchemeCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  categoryContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
  },
  schemeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  schemeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  schemeName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
  },
  schemeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  schemeFooter: {
    marginTop: 8,
  },
  benefitsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  benefitsText: {
    fontSize: 14,
    color: '#424242',
  },
  deadlineContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  deadlineText: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});
