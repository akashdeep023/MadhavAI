/**
 * AccessibleButton Component
 * Large, clear button with icon and minimal text for low-literacy users
 * Requirements: 12.2, 12.5, 12.6, 12.7
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, AccessibilityProps } from 'react-native';

interface AccessibleButtonProps extends AccessibilityProps {
  icon: string; // Emoji or icon character
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  testID?: string;
}

/**
 * Accessible button with large icon and minimal text
 * Optimized for low-literacy users with clear visual indicators
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  icon,
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
  ];

  const iconStyle = [styles.icon, styles[`icon_${size}`]];
  const labelStyle = [styles.label, styles[`label_${size}`]];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      {...accessibilityProps}
    >
      <View style={styles.content}>
        <Text style={iconStyle}>{icon}</Text>
        <Text style={labelStyle}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button_primary: {
    backgroundColor: '#4CAF50',
  },
  button_secondary: {
    backgroundColor: '#2196F3',
  },
  button_success: {
    backgroundColor: '#8BC34A',
  },
  button_warning: {
    backgroundColor: '#FF9800',
  },
  button_danger: {
    backgroundColor: '#F44336',
  },
  button_disabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    minWidth: 80,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 64,
    minWidth: 120,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 80,
    minWidth: 160,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  icon_small: {
    fontSize: 24,
    marginBottom: 4,
  },
  icon_medium: {
    fontSize: 32,
    marginBottom: 6,
  },
  icon_large: {
    fontSize: 48,
    marginBottom: 8,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  label_small: {
    fontSize: 14,
  },
  label_medium: {
    fontSize: 16,
  },
  label_large: {
    fontSize: 20,
  },
});
