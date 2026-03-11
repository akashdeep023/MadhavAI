/**
 * LazyLoader Utility
 * Implements lazy loading for components and resources
 * Requirements: 17.6, 17.8
 */

import React, { Suspense, ComponentType, lazy } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LazyLoaderProps {
  loadingText?: string;
  errorText?: string;
}

/**
 * Creates a lazy-loaded component with loading fallback
 * Reduces initial bundle size and improves performance on low-end devices
 */
export function createLazyComponent<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
): ComponentType<P> {
  const LazyComponent = lazy(importFunc);

  return (props: P) => (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4CAF50" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

/**
 * Custom loading fallback with message
 */
export const LoadingFallback: React.FC<LazyLoaderProps> = ({ loadingText = 'Loading...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4CAF50" />
    <Text style={styles.loadingText}>{loadingText}</Text>
  </View>
);

/**
 * Error boundary fallback
 */
export const ErrorFallback: React.FC<LazyLoaderProps> = ({
  errorText = 'Failed to load component',
}) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.errorText}>{errorText}</Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFEBEE',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
});
