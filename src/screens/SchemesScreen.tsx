import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SchemeList } from '../components/scheme/SchemeList';
import { SchemeDetail } from '../components/scheme/SchemeDetail';
import { eligibilityChecker } from '../services/scheme/EligibilityChecker';
import { profileManager } from '../services/profile/ProfileManager';
import { logger } from '../utils/logger';
import { useTranslation } from '../hooks/useTranslation';

export default function SchemesScreen() {
  const { t } = useTranslation();
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  const handleSchemeSelect = (scheme: any) => {
    setSelectedScheme(scheme);
    setEligibilityResult(null); // Reset eligibility when selecting new scheme
  };

  const handleBack = () => {
    setSelectedScheme(null);
    setEligibilityResult(null);
  };

  const handleCheckEligibility = async () => {
    try {
      logger.info('Checking eligibility for scheme', selectedScheme.id);

      // Get user profile
      const profile = await profileManager.getProfile();

      if (!profile) {
        logger.warn('No user profile found');
        return;
      }

      // Check eligibility
      const result = eligibilityChecker.checkEligibility(selectedScheme, profile);
      setEligibilityResult(result);

      logger.info('Eligibility check complete', result);
    } catch (error) {
      logger.error('Failed to check eligibility', error);
    }
  };

  const handleApply = () => {
    // Handle application - could open browser or navigate to application form
    logger.info('Apply for scheme', selectedScheme.id);
  };

  if (selectedScheme) {
    return (
      <View style={styles.container}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <SchemeDetail
          scheme={selectedScheme}
          eligibilityResult={eligibilityResult}
          onCheckEligibility={handleCheckEligibility}
          onApply={handleApply}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SchemeList onSchemeSelect={handleSchemeSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButtonContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
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
});
