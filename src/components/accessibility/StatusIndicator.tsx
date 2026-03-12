/**
 * StatusIndicator Component
 * Visual indicators using colors and icons for status and alerts
 * Requirements: 12.5, 12.6
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusIndicatorProps {
  type: StatusType;
  message: string;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Visual status indicator with color coding and icons
 * Provides clear visual feedback for low-literacy users
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  message,
  icon,
  size = 'medium',
  accessible = true,
  accessibilityLabel,
}) => {
  const defaultIcons: Record<StatusType, string> = {
    success: '✅',
    warning: '⚠️',
    danger: '❌',
    info: 'ℹ️',
    neutral: '⚪',
  };

  const displayIcon = icon || defaultIcons[type];

  const containerStyle = [
    styles.container,
    styles[`container_${type}`],
    styles[`container_${size}`],
  ];

  const iconStyle = [styles.icon, styles[`icon_${size}`]];
  const messageStyle = [styles.message, styles[`message_${size}`]];

  return (
    <View
      style={containerStyle}
      accessible={accessible}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel || `${type}: ${message}`}
    >
      <Text style={iconStyle}>{displayIcon}</Text>
      <Text style={messageStyle}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  container_success: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  container_warning: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  container_danger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  container_info: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  container_neutral: {
    backgroundColor: '#F5F5F5',
    borderColor: '#9E9E9E',
  },
  container_small: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  container_medium: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  container_large: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  icon_small: {
    fontSize: 16,
  },
  icon_medium: {
    fontSize: 24,
  },
  icon_large: {
    fontSize: 32,
  },
  message: {
    flex: 1,
    fontWeight: '600',
  },
  message_small: {
    fontSize: 14,
  },
  message_medium: {
    fontSize: 16,
  },
  message_large: {
    fontSize: 18,
  },
});
