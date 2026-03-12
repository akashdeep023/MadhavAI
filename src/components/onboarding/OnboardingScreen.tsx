/**
 * OnboardingScreen Component
 * First-time user walkthrough with simple language and visuals
 * Requirements: 12.4, 12.8
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  videoUrl?: string;
}

interface OnboardingScreenProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * Onboarding screen with step-by-step walkthrough
 * Uses simple language and large visuals for low-literacy users
 */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  steps,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const step = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentStep(step);
  };

  const goToStep = (step: number) => {
    scrollViewRef.current?.scrollTo({
      x: step * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with skip button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome</Text>
        {onSkip && (
          <TouchableOpacity
            onPress={onSkip}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Skip tutorial"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Steps carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {steps.map((step) => (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Progress indicators */}
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[styles.progressDot, index === currentStep && styles.progressDot_active]}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <AccessibleButton
            icon="⬅️"
            label="Previous"
            onPress={handlePrevious}
            variant="secondary"
            size="medium"
            accessibilityLabel="Go to previous step"
          />
        )}
        <View style={styles.spacer} />
        <AccessibleButton
          icon={currentStep === steps.length - 1 ? '✅' : '➡️'}
          label={currentStep === steps.length - 1 ? 'Start' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="medium"
          accessibilityLabel={
            currentStep === steps.length - 1
              ? 'Complete tutorial and start using app'
              : 'Go to next step'
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  skipText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stepContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  stepIcon: {
    fontSize: 120,
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 28,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 6,
  },
  progressDot_active: {
    backgroundColor: '#4CAF50',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  spacer: {
    flex: 1,
  },
});
