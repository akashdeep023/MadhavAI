/**
 * ContextualHelp Component
 * Provides contextual help tooltips and hints
 * Requirements: 12.4, 12.8
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AccessibleButton } from '../accessibility/AccessibleButton';

interface ContextualHelpProps {
  title: string;
  content: string;
  icon?: string;
  videoUrl?: string;
}

/**
 * Contextual help component with simple explanations
 * Provides on-demand help without cluttering the interface
 */
export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  content,
  icon = 'ℹ️',
  videoUrl,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => setVisible(true)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Show help"
        accessibilityHint={`Get help about ${title}`}
      >
        <Text style={styles.helpIcon}>{icon}</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close help"
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>{content}</Text>

            {videoUrl && (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoIcon}>🎥</Text>
                <Text style={styles.videoText}>Video tutorial available</Text>
              </View>
            )}

            <AccessibleButton
              icon="✅"
              label="Got it"
              onPress={() => setVisible(false)}
              variant="primary"
              size="medium"
              accessibilityLabel="Close help and continue"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  helpIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  closeButton: {
    fontSize: 28,
    color: '#666666',
    paddingLeft: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
  },
  videoPlaceholder: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  videoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  videoText: {
    fontSize: 14,
    color: '#666666',
  },
});
