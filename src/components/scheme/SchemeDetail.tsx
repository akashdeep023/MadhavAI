/**
 * Scheme Detail Component
 * Requirements: 2.1, 2.3, 2.5
 * 
 * Displays detailed information about a government scheme
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Scheme } from '../../types/scheme.types';
import { EligibilityResult } from '../../types/scheme.types';

interface SchemeDetailProps {
  scheme: Scheme;
  eligibilityResult?: EligibilityResult;
  onCheckEligibility: () => void;
  onApply: () => void;
}

export const SchemeDetail: React.FC<SchemeDetailProps> = ({
  scheme,
  eligibilityResult,
  onCheckEligibility,
  onApply,
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const renderEligibilityStatus = () => {
    if (!eligibilityResult) {
      return (
        <View style={styles.eligibilityContainer}>
          <Text style={styles.sectionTitle}>Check Your Eligibility</Text>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={onCheckEligibility}
            accessibilityLabel="Check eligibility"
            accessibilityRole="button"
          >
            <Text style={styles.checkButtonText}>Check Eligibility</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.eligibilityContainer}>
        <View
          style={[
            styles.eligibilityBadge,
            eligibilityResult.isEligible ? styles.eligibleBadge : styles.ineligibleBadge,
          ]}
        >
          <Text style={styles.eligibilityBadgeText}>
            {eligibilityResult.isEligible ? '✓ Eligible' : '✗ Not Eligible'}
          </Text>
        </View>

        <View style={styles.reasonsContainer}>
          {eligibilityResult.reasons.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {eligibilityResult.isEligible && (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={onApply}
            accessibilityLabel="Apply for scheme"
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.schemeName}>{scheme.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{scheme.category}</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.description}>{scheme.description}</Text>
      </View>

      {/* Deadline */}
      {scheme.applicationDeadline && (
        <View style={styles.deadlineAlert}>
          <Text style={styles.deadlineText}>
            ⏰ Application Deadline: {new Date(scheme.applicationDeadline).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Eligibility Status */}
      {renderEligibilityStatus()}

      {/* Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benefits</Text>
        {scheme.benefits.map((benefit, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>✓</Text>
            <Text style={styles.listText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {/* Required Documents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Documents</Text>
        {scheme.requiredDocuments.map((doc, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>📄</Text>
            <Text style={styles.listText}>{doc}</Text>
          </View>
        ))}
      </View>

      {/* Application Steps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application Steps</Text>
        {scheme.applicationSteps.map((step, index) => (
          <TouchableOpacity
            key={index}
            style={styles.stepCard}
            onPress={() => setExpandedStep(expandedStep === index ? null : index)}
            accessibilityLabel={`Step ${step.stepNumber}: ${step.title}`}
            accessibilityRole="button"
          >
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>

            {expandedStep === index && (
              <View style={styles.stepContent}>
                <Text style={styles.stepDescription}>{step.description}</Text>

                {step.requiredDocuments && step.requiredDocuments.length > 0 && (
                  <View style={styles.stepDocuments}>
                    <Text style={styles.stepDocumentsLabel}>Documents needed:</Text>
                    {step.requiredDocuments.map((doc, docIndex) => (
                      <Text key={docIndex} style={styles.stepDocumentItem}>
                        • {doc}
                      </Text>
                    ))}
                  </View>
                )}

                {step.estimatedTime && (
                  <Text style={styles.stepTime}>⏱️ {step.estimatedTime}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Contact Information */}
      {scheme.contactInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {scheme.contactInfo.phone && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => openUrl(`tel:${scheme.contactInfo!.phone}`)}
            >
              <Text style={styles.contactLabel}>📞 Phone:</Text>
              <Text style={styles.contactValue}>{scheme.contactInfo.phone}</Text>
            </TouchableOpacity>
          )}
          {scheme.contactInfo.email && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => openUrl(`mailto:${scheme.contactInfo!.email}`)}
            >
              <Text style={styles.contactLabel}>✉️ Email:</Text>
              <Text style={styles.contactValue}>{scheme.contactInfo.email}</Text>
            </TouchableOpacity>
          )}
          {scheme.contactInfo.website && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => openUrl(scheme.contactInfo!.website!)}
            >
              <Text style={styles.contactLabel}>🌐 Website:</Text>
              <Text style={styles.contactValue}>{scheme.contactInfo.website}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Apply Button */}
      {scheme.applicationUrl && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.applyOnlineButton}
            onPress={() => openUrl(scheme.applicationUrl!)}
            accessibilityLabel="Apply online"
            accessibilityRole="button"
          >
            <Text style={styles.applyOnlineButtonText}>Apply Online</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  schemeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  section: {
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 24,
  },
  deadlineAlert: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  eligibilityContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 12,
  },
  eligibilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  eligibleBadge: {
    backgroundColor: '#E8F5E9',
  },
  ineligibleBadge: {
    backgroundColor: '#FFEBEE',
  },
  eligibilityBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reasonsContainer: {
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reasonBullet: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  listBullet: {
    fontSize: 16,
    marginRight: 8,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  stepContent: {
    marginTop: 12,
    paddingLeft: 44,
  },
  stepDescription: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepDocuments: {
    marginTop: 8,
  },
  stepDocumentsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  stepDocumentItem: {
    fontSize: 13,
    color: '#424242',
    marginLeft: 8,
  },
  stepTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  contactItem: {
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#1976D2',
  },
  applyOnlineButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyOnlineButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
