/**
 * IconNavigationCard Component
 * Large icon-based navigation card with minimal text
 * Requirements: 12.2, 12.7
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface IconNavigationCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: number;
  badgeColor?: string;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Navigation card with large icon and minimal text
 * Optimized for easy recognition by low-literacy users
 */
export const IconNavigationCard: React.FC<IconNavigationCardProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  badgeColor = '#F44336',
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    minWidth: 140,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    margin: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  icon: {
    fontSize: 56,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666666',
  },
});
