import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { CropRecommender } from '../services/recommendation/CropRecommender';
import { FertilizerRecommender } from '../services/recommendation/FertilizerRecommender';
import { SeedRecommender } from '../services/recommendation/SeedRecommender';
import { FarmingContextBuilder } from '../services/recommendation/FarmingContextBuilder';
import { logger } from '../utils/logger';
import { useTranslation } from '../hooks/useTranslation';

export default function RecommendationsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'crop' | 'fertilizer' | 'seed'>('crop');
  const [recommendations, setRecommendations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const contextBuilder = new FarmingContextBuilder();
      const context = await contextBuilder.buildContext('demo-user-001');

      let data;
      if (activeTab === 'crop') {
        const recommender = new CropRecommender();
        data = await recommender.generateRecommendations(context);
      } else if (activeTab === 'fertilizer') {
        const recommender = new FertilizerRecommender();
        data = await recommender.generateRecommendations(context, 'wheat', 'vegetative');
      } else {
        const recommender = new SeedRecommender();
        // Don't filter by specific crop - show all suitable varieties for current season
        data = await recommender.generateRecommendations(context);
      }

      setRecommendations(data);

      // Log for debugging
      if (data && data.length === 0) {
        console.log('No recommendations generated for', activeTab);
      }
    } catch (err) {
      logger.error('Failed to load recommendations', err);
      setError(t('recommendations.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const renderCropRecommendations = () => {
    if (!recommendations || !Array.isArray(recommendations)) return null;

    return recommendations.map((rec: any, index: number) => (
      <View key={index} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cropName}>{rec.cropName}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{rec.overallScore}</Text>
          </View>
        </View>

        <View style={styles.scoresRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreItemLabel}>Suitability</Text>
            <Text style={[styles.scoreItemValue, { color: '#4CAF50' }]}>
              {rec.suitabilityScore}%
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreItemLabel}>Profitability</Text>
            <Text style={[styles.scoreItemValue, { color: '#2196F3' }]}>
              {rec.profitabilityScore}%
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreItemLabel}>Risk</Text>
            <Text style={[styles.scoreItemValue, { color: '#FF9800' }]}>{rec.riskScore}%</Text>
          </View>
        </View>

        <Text style={styles.explanation}>{rec.explanation}</Text>

        {rec.cultivationPlan && (
          <View style={styles.planSection}>
            <Text style={styles.planTitle}>Cultivation Plan</Text>
            <View style={styles.planDetails}>
              <Text style={styles.planDetail}>Duration: {rec.cultivationPlan.duration} days</Text>
              <Text style={styles.planDetail}>
                Est. Cost: ₹{rec.cultivationPlan.estimatedCost.min} - ₹
                {rec.cultivationPlan.estimatedCost.max}
              </Text>
              <Text style={styles.planDetail}>
                Est. Yield: {rec.cultivationPlan.estimatedYield.min}-
                {rec.cultivationPlan.estimatedYield.max} {rec.cultivationPlan.estimatedYield.unit}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence: {rec.confidence}%</Text>
        </View>
      </View>
    ));
  };

  const renderFertilizerRecommendations = () => {
    if (!recommendations || !Array.isArray(recommendations)) return null;

    return recommendations.map((rec: any, index: number) => (
      <View key={index} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.fertilizerName}>{rec.nutrient || 'Unknown Nutrient'}</Text>
          <View
            style={[
              styles.typeBadge,
              rec.type === 'organic' ? styles.organicBadge : styles.chemicalBadge,
            ]}
          >
            <Text style={styles.typeBadgeText}>{rec.type || 'N/A'}</Text>
          </View>
        </View>

        <Text style={styles.productName}>{rec.name || 'Unknown Product'}</Text>

        {rec.dosage && (
          <View style={styles.dosageSection}>
            <Text style={styles.sectionTitle}>Dosage</Text>
            <Text style={styles.dosageText}>
              {rec.dosage.amount || 0} {rec.dosage.unit || 'kg'}{' '}
              {rec.dosage.perArea || 'per hectare'}
            </Text>
          </View>
        )}

        {rec.applicationTiming && (
          <View style={styles.timingSection}>
            <Text style={styles.sectionTitle}>Application Timing</Text>
            <Text style={styles.timingText}>{rec.applicationTiming}</Text>
          </View>
        )}

        {rec.applicationMethod && (
          <View style={styles.methodSection}>
            <Text style={styles.sectionTitle}>Application Method</Text>
            <Text style={styles.methodText}>{rec.applicationMethod}</Text>
          </View>
        )}

        {rec.cost && (
          <View style={styles.costSection}>
            <Text style={styles.sectionTitle}>Estimated Cost</Text>
            <Text style={styles.costText}>
              ₹{rec.cost.min || 0} - ₹{rec.cost.max || 0}
            </Text>
          </View>
        )}

        {rec.explanation && <Text style={styles.explanation}>{rec.explanation}</Text>}

        {rec.alternatives && rec.alternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            <Text style={styles.alternativesTitle}>Alternatives</Text>
            {rec.alternatives.map((alt: any, altIndex: number) => (
              <View key={altIndex} style={styles.alternativeItem}>
                <Text style={styles.alternativeName}>{alt.name || 'Unknown'}</Text>
                {alt.dosage && alt.cost && (
                  <Text style={styles.alternativeDetails}>
                    {alt.dosage.amount || 0} {alt.dosage.unit || 'kg'} • ₹{alt.cost.min || 0}-₹
                    {alt.cost.max || 0}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    ));
  };

  const renderSeedRecommendations = () => {
    if (!recommendations || !Array.isArray(recommendations)) return null;

    return recommendations.map((rec: any, index: number) => (
      <View key={index} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.seedName}>{rec.variety || rec.varietyName || 'Unknown Variety'}</Text>
          {rec.confidence && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Confidence</Text>
              <Text style={styles.scoreValue}>{rec.confidence}%</Text>
            </View>
          )}
        </View>

        {rec.cropName && <Text style={styles.seedType}>Crop: {rec.cropName}</Text>}

        {rec.diseaseResistance && rec.diseaseResistance.length > 0 && (
          <View style={styles.characteristicsSection}>
            <Text style={styles.sectionTitle}>Disease Resistance</Text>
            {rec.diseaseResistance.map((disease: string, diseaseIndex: number) => (
              <Text key={diseaseIndex} style={styles.characteristicItem}>
                • {disease}
              </Text>
            ))}
          </View>
        )}

        {rec.yieldPotential && (
          <View style={styles.yieldSection}>
            <Text style={styles.sectionTitle}>Yield Potential</Text>
            <Text style={styles.yieldText}>
              {rec.yieldPotential.min || 0}-{rec.yieldPotential.max || 0}{' '}
              {rec.yieldPotential.unit || 'kg/ha'}
            </Text>
          </View>
        )}

        {rec.duration && (
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Crop Duration</Text>
            <Text style={styles.durationText}>{rec.duration} days</Text>
          </View>
        )}

        {rec.seedRate && (
          <View style={styles.seedRateSection}>
            <Text style={styles.sectionTitle}>Seed Rate</Text>
            <Text style={styles.seedRateText}>
              {rec.seedRate.amount} {rec.seedRate.unit} per {rec.seedRate.perArea}
            </Text>
          </View>
        )}

        {rec.sowingWindow && (
          <View style={styles.sowingSection}>
            <Text style={styles.sectionTitle}>Sowing Window</Text>
            <Text style={styles.sowingText}>
              {new Date(rec.sowingWindow.start).toLocaleDateString()} -{' '}
              {new Date(rec.sowingWindow.end).toLocaleDateString()}
            </Text>
          </View>
        )}

        {rec.explanation && <Text style={styles.explanation}>{rec.explanation}</Text>}

        {rec.sources && rec.sources.length > 0 && (
          <View style={styles.sourcesSection}>
            <Text style={styles.sourcesTitle}>Seed Sources</Text>
            {rec.sources.map((source: any, sourceIndex: number) => (
              <View key={sourceIndex} style={styles.sourceItem}>
                <View style={styles.sourceHeader}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  {source.certified && (
                    <View style={styles.certifiedBadge}>
                      <Text style={styles.certifiedText}>✓ Certified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sourceLocation}>{source.location}</Text>
                {source.price && (
                  <Text style={styles.sourcePrice}>
                    ₹{source.price.min}-₹{source.price.max} {source.price.unit}
                  </Text>
                )}
                {source.contact && (
                  <Text style={styles.sourceContact}>Contact: {source.contact}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'crop' && styles.activeTab]}
          onPress={() => setActiveTab('crop')}
        >
          <Text style={[styles.tabText, activeTab === 'crop' && styles.activeTabText]}>
            {t('recommendations.crop')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fertilizer' && styles.activeTab]}
          onPress={() => setActiveTab('fertilizer')}
        >
          <Text style={[styles.tabText, activeTab === 'fertilizer' && styles.activeTabText]}>
            {t('recommendations.fertilizer')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'seed' && styles.activeTab]}
          onPress={() => setActiveTab('seed')}
        >
          <Text style={[styles.tabText, activeTab === 'seed' && styles.activeTabText]}>
            {t('recommendations.seed')}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>{t('recommendations.title')}</Text>
        {recommendations && recommendations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('recommendations.noData')}</Text>
          </View>
        )}
        {activeTab === 'crop' && renderCropRecommendations()}
        {activeTab === 'fertilizer' && renderFertilizerRecommendations()}
        {activeTab === 'seed' && renderSeedRecommendations()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cropName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  fertilizerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    flex: 1,
  },
  seedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00',
    flex: 1,
  },
  seedType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scoreContainer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreItemLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  explanation: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  planSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  planDetails: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  planDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  confidenceContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  organicBadge: {
    backgroundColor: '#4CAF50',
  },
  chemicalBadge: {
    backgroundColor: '#2196F3',
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dosageSection: {
    marginBottom: 12,
  },
  dosageText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  timingSection: {
    marginBottom: 12,
  },
  timingText: {
    fontSize: 14,
    color: '#555',
  },
  methodSection: {
    marginBottom: 12,
  },
  methodText: {
    fontSize: 14,
    color: '#555',
  },
  costSection: {
    marginBottom: 12,
  },
  costText: {
    fontSize: 16,
    color: '#F57C00',
    fontWeight: '600',
  },
  alternativesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  alternativeItem: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  alternativeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 2,
  },
  alternativeDetails: {
    fontSize: 12,
    color: '#777',
  },
  characteristicsSection: {
    marginBottom: 12,
  },
  characteristicItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    paddingLeft: 8,
  },
  yieldSection: {
    marginBottom: 12,
  },
  yieldText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  durationSection: {
    marginBottom: 12,
  },
  durationText: {
    fontSize: 14,
    color: '#555',
  },
  seedRateSection: {
    marginBottom: 12,
  },
  seedRateText: {
    fontSize: 14,
    color: '#555',
  },
  sowingSection: {
    marginBottom: 12,
  },
  sowingText: {
    fontSize: 14,
    color: '#555',
  },
  sourcesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sourceItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  certifiedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  certifiedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  sourceLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  sourcePrice: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceContact: {
    fontSize: 12,
    color: '#2196F3',
  },
});
