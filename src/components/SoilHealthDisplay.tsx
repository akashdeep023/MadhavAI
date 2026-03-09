/**
 * Soil Health Display Component
 * Requirements: 10.1, 10.6
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SoilHealthData, SoilAnalysis, SoilImprovement } from '../types/soil.types';
import { soilApi } from '../services/api/soilApi';
import { soilAnalyzer } from '../services/soil/SoilAnalyzer';
import { improvementAdvisor } from '../services/soil/ImprovementAdvisor';
import { cropMatcher } from '../services/soil/CropMatcher';
import { soilHealthStorage } from '../services/soil/SoilHealthStorage';
import { config } from '../config/env';

interface SoilHealthDisplayProps {
  userId: string;
  onUploadPress?: () => void;
}

export const SoilHealthDisplay: React.FC<SoilHealthDisplayProps> = ({
  userId,
  onUploadPress,
}) => {
  const [loading, setLoading] = useState(true);
  const [soilRecords, setSoilRecords] = useState<SoilHealthData[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SoilHealthData | null>(null);
  const [analysis, setAnalysis] = useState<SoilAnalysis | null>(null);
  const [improvements, setImprovements] = useState<SoilImprovement[]>([]);
  const [cropMatches, setCropMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSoilRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (selectedRecord) {
      analyzeSoil(selectedRecord);
    }
  }, [selectedRecord]);

  const loadSoilRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get records from local storage
      const localRecords = await soilHealthStorage.getUserSoilHealthRecords(userId);
      
      // Only try API if ENABLE_API is true
      let apiRecords: SoilHealthData[] = [];
      if (config.ENABLE_API) {
        try {
          apiRecords = await soilApi.getSoilHealthByUser(userId);
        } catch {
          // API error - silently continue with local data
        }
      }
      
      // Combine local and API records
      const allRecords = [...localRecords, ...apiRecords];
      
      if (allRecords.length === 0) {
        // No records found - show empty state
        setSoilRecords([]);
        setSelectedRecord(null);
      } else {
        // Remove duplicates based on ID
        const uniqueRecords = Array.from(
          new Map(allRecords.map(record => [record.id, record])).values()
        );
        
        // Sort by test date (most recent first)
        uniqueRecords.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());
        
        setSoilRecords(uniqueRecords);
        setSelectedRecord(uniqueRecords[0]);
      }
    } catch {
      setError('Failed to load soil health records');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSoil = async (soilData: SoilHealthData) => {
    try {
      // Analyze soil health
      const soilAnalysis = soilAnalyzer.analyzeSoilHealth(soilData);
      setAnalysis(soilAnalysis);

      // Get improvement recommendations
      const soilImprovements = improvementAdvisor.generateRecommendations(soilData);
      setImprovements(soilImprovements);

      // Get crop matches
      const matches = cropMatcher.getTopMatches(soilData, 5);
      setCropMatches(matches);
    } catch {
      setError('Failed to analyze soil data');
    }
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#3b82f6';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading soil health data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSoilRecords}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (soilRecords.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No soil health records found</Text>
        {onUploadPress && (
          <TouchableOpacity style={styles.uploadButton} onPress={onUploadPress}>
            <Text style={styles.uploadButtonText}>Upload Soil Health Card</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Soil Record Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soil Health Records</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {soilRecords.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={[
                styles.recordCard,
                selectedRecord?.id === record.id && styles.selectedRecordCard,
              ]}
              onPress={() => setSelectedRecord(record)}
            >
              <Text style={styles.recordDate}>
                {new Date(record.testDate).toLocaleDateString()}
              </Text>
              <Text style={styles.recordLab}>{record.labName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Overall Rating */}
      {analysis && (
        <View style={styles.section}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingLabel}>Overall Rating</Text>
            <View
              style={[
                styles.ratingBadge,
                { backgroundColor: getRatingColor(analysis.overallRating) },
              ]}
            >
              <Text style={styles.ratingText}>
                {analysis.overallRating.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.scoreText}>Score: {analysis.score}/100</Text>
            <Text style={styles.summaryText}>{analysis.interpretation.summary}</Text>
          </View>
        </View>
      )}

      {/* Soil Parameters */}
      {selectedRecord && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soil Parameters</Text>
          <View style={styles.parametersGrid}>
            <View style={styles.parameterCard}>
              <Text style={styles.parameterLabel}>pH</Text>
              <Text style={styles.parameterValue}>
                {selectedRecord.parameters.pH.toFixed(1)}
              </Text>
            </View>
            <View style={styles.parameterCard}>
              <Text style={styles.parameterLabel}>Nitrogen</Text>
              <Text style={styles.parameterValue}>
                {selectedRecord.parameters.nitrogen} kg/ha
              </Text>
            </View>
            <View style={styles.parameterCard}>
              <Text style={styles.parameterLabel}>Phosphorus</Text>
              <Text style={styles.parameterValue}>
                {selectedRecord.parameters.phosphorus} kg/ha
              </Text>
            </View>
            <View style={styles.parameterCard}>
              <Text style={styles.parameterLabel}>Potassium</Text>
              <Text style={styles.parameterValue}>
                {selectedRecord.parameters.potassium} kg/ha
              </Text>
            </View>
            <View style={styles.parameterCard}>
              <Text style={styles.parameterLabel}>Organic Carbon</Text>
              <Text style={styles.parameterValue}>
                {selectedRecord.parameters.organicCarbon.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.parameterCard}>
              <Text style={styles.parameterLabel}>Soil Type</Text>
              <Text style={styles.parameterValue}>{selectedRecord.soilType}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Suitable Crops */}
      {cropMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suitable Crops</Text>
          {cropMatches.map((match, index) => (
            <View key={index} style={styles.cropCard}>
              <View style={styles.cropHeader}>
                <Text style={styles.cropName}>{match.crop}</Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.cropScore}>{match.suitabilityScore}%</Text>
                </View>
              </View>
              <Text style={styles.cropExplanation}>{match.explanation}</Text>
              {match.recommendations.length > 0 && (
                <View style={styles.cropRecommendations}>
                  {match.recommendations.map((rec: string, idx: number) => (
                    <Text key={idx} style={styles.cropRecommendation}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Improvement Recommendations */}
      {improvements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Improvement Recommendations</Text>
          {improvements.map((improvement, index) => (
            <View key={index} style={styles.improvementCard}>
              <View style={styles.improvementHeader}>
                <Text style={styles.improvementDeficiency}>
                  {improvement.deficiency}
                </Text>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(improvement.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {improvement.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.improvementTimeline}>
                Timeline: {improvement.timeline}
              </Text>
              {improvement.recommendations.slice(0, 2).map((rec, idx) => (
                <View key={idx} style={styles.recommendationOption}>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.recommendationDescription}>
                    {rec.description}
                  </Text>
                  <Text style={styles.recommendationRate}>
                    Rate: {rec.application.rate}
                  </Text>
                  {rec.cost && (
                    <Text style={styles.recommendationCost}>
                      Cost: ₹{rec.cost.min} - ₹{rec.cost.max}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Upload Button */}
      {onUploadPress && (
        <TouchableOpacity style={styles.uploadButton} onPress={onUploadPress}>
          <Text style={styles.uploadButtonText}>Upload New Soil Health Card</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    marginTop: 16,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedRecordCard: {
    borderColor: '#3b82f6',
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  recordLab: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  ratingCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  parametersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  parameterCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    marginBottom: 12,
  },
  parameterLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cropCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  scoreContainer: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cropScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cropExplanation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  cropRecommendations: {
    marginTop: 8,
  },
  cropRecommendation: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  improvementCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  improvementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  improvementDeficiency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  improvementTimeline: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  recommendationOption: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  recommendationRate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  recommendationCost: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
