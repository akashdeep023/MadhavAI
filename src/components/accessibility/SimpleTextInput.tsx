/**
 * SimpleTextInput Component
 * Large, clear text input with voice support
 * Requirements: 12.2, 12.3, 12.4, 12.6
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';

interface SimpleTextInputProps extends TextInputProps {
  label: string;
  icon?: string;
  error?: string;
  onVoiceInput?: () => void;
  voiceSupported?: boolean;
  required?: boolean;
}

/**
 * Simple text input with large text and optional voice input
 * Uses simple language and clear visual indicators
 */
export const SimpleTextInput: React.FC<SimpleTextInputProps> = ({
  label,
  icon,
  error,
  onVoiceInput,
  voiceSupported = false,
  required = false,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = [
    styles.container,
    isFocused && styles.container_focused,
    error && styles.container_error,
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelContainer}>
        {icon && <Text style={styles.labelIcon}>{icon}</Text>}
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      <View style={containerStyle}>
        <TextInput
          style={styles.input}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#999999"
          accessible={true}
          accessibilityLabel={label}
          {...textInputProps}
        />
        {voiceSupported && onVoiceInput && (
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={onVoiceInput}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Voice input"
            accessibilityHint="Tap to speak your input"
          >
            <Text style={styles.voiceIcon}>🎤</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  required: {
    color: '#F44336',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  container_focused: {
    borderColor: '#4CAF50',
  },
  container_error: {
    borderColor: '#F44336',
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#333333',
    paddingVertical: 12,
  },
  voiceButton: {
    padding: 8,
    marginLeft: 8,
  },
  voiceIcon: {
    fontSize: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
  },
});
