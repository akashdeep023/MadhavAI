/**
 * Update Manager Component
 * 
 * Handles app updates including:
 * - OTA content updates
 * - Critical security updates
 * - Feature updates
 * - Backward compatibility checks
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import OTAUpdateService from '../services/OTAUpdateService';

interface UpdateManagerProps {
  onUpdateComplete?: () => void;
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({ onUpdateComplete }) => {
  const [isCritical, setIsCritical] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    checkForUpdates();
    
    // Start automatic update checks
    OTAUpdateService.startAutoUpdateCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkForUpdates = async () => {
    try {
      const updates = await OTAUpdateService.checkForUpdates();
      const hasCritical = await OTAUpdateService.hasCriticalUpdates();
      
      setIsCritical(hasCritical);
      
      if (hasCritical) {
        // Force critical updates immediately
        setShowUpdateModal(true);
        await installCriticalUpdates();
      } else if (updates.length > 0) {
        // Show optional update prompt
        setShowUpdateModal(true);
      }
    } catch {
      // Silently fail - updates are optional
    }
  };

  const installCriticalUpdates = async () => {
    setIsUpdating(true);
    try {
      await OTAUpdateService.forceCriticalUpdates();
      Alert.alert(
        'Update Complete',
        'Critical updates have been installed successfully.',
        [{ text: 'OK', onPress: () => {
          setShowUpdateModal(false);
          onUpdateComplete?.();
        }}]
      );
    } catch (error) {
      console.error('Failed to install critical updates:', error);
      Alert.alert(
        'Update Failed',
        'Failed to install critical updates. Please try again or contact support.',
        [{ text: 'Retry', onPress: installCriticalUpdates }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const installOptionalUpdates = async () => {
    setIsUpdating(true);
    try {
      await OTAUpdateService.installPendingUpdates();
      Alert.alert(
        'Update Complete',
        'Updates have been installed successfully.',
        [{ text: 'OK', onPress: () => {
          setShowUpdateModal(false);
          onUpdateComplete?.();
        }}]
      );
    } catch (error) {
      console.error('Failed to install updates:', error);
      Alert.alert(
        'Update Failed',
        'Some updates could not be installed. The app will continue to work normally.',
        [{ text: 'OK', onPress: () => setShowUpdateModal(false) }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    if (!isCritical) {
      setShowUpdateModal(false);
    }
  };

  if (!showUpdateModal) {
    return null;
  }

  return (
    <Modal
      visible={showUpdateModal}
      transparent
      animationType="fade"
      onRequestClose={dismissUpdate}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {isCritical ? (
            <>
              <Text style={styles.title}>⚠️ Critical Update Required</Text>
              <Text style={styles.message}>
                A critical security update is required to continue using MadhavAI.
                This update will be installed automatically.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>🎉 Update Available</Text>
              <Text style={styles.message}>
                New content and improvements are available. Update now to get the
                latest features and bug fixes.
              </Text>
            </>
          )}

          {isUpdating ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.progressText}>Installing updates...</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              {isCritical ? (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={installCriticalUpdates}
                  disabled={isUpdating}
                >
                  <Text style={styles.primaryButtonText}>Install Now</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={installOptionalUpdates}
                    disabled={isUpdating}
                  >
                    <Text style={styles.primaryButtonText}>Update Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={dismissUpdate}
                    disabled={isUpdating}
                  >
                    <Text style={styles.secondaryButtonText}>Later</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UpdateManager;
