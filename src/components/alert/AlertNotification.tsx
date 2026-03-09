/**
 * AlertNotification Component
 * Displays alert notification with voice reading capability
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { Alert, AlertPriority } from '../../types/alert.types';

interface AlertNotificationProps {
  alert: Alert;
  visible: boolean;
  onDismiss: () => void;
  onAction?: () => void;
  onReadAloud?: (text: string) => void;
}

export const AlertNotification: React.FC<AlertNotificationProps> = ({
  alert,
  visible,
  onDismiss,
  onAction,
  onReadAloud,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const getPriorityColor = (priority: AlertPriority): string => {
    switch (priority) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getPriorityIcon = (priority: AlertPriority): string => {
    switch (priority) {
      case 'critical':
        return '⚠️';
      case 'high':
        return '❗';
      case 'medium':
        return 'ℹ️';
      case 'low':
        return '✓';
      default:
        return '•';
    }
  };

  const handleReadAloud = () => {
    if (onReadAloud) {
      const text = `${alert.title}. ${alert.message}`;
      onReadAloud(text);
    }
  };

  if (!visible) return null;

  const priorityColor = getPriorityColor(alert.priority);
  const priorityIcon = getPriorityIcon(alert.priority);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.notificationCard,
            { opacity: fadeAnim, borderLeftColor: priorityColor },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{priorityIcon}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{alert.title}</Text>
              <Text style={styles.priority}>
                {alert.priority.toUpperCase()} PRIORITY
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.message}>{alert.message}</Text>

          <View style={styles.actions}>
            {onReadAloud && (
              <TouchableOpacity
                style={[styles.button, styles.voiceButton]}
                onPress={handleReadAloud}
              >
                <Text style={styles.voiceButtonText}>🔊 Read Aloud</Text>
              </TouchableOpacity>
            )}

            {alert.actionable && onAction && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={onAction}
              >
                <Text style={styles.actionButtonText}>Take Action</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.dismissButton]}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  priority: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  actions: {
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  voiceButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E40AF',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    backgroundColor: '#F3F4F6',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});
