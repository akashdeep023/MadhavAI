/**
 * AlertPreferences Component
 * UI for managing alert preferences and settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AlertPreferences as AlertPreferencesType, AlertType } from '../../types/alert.types';

interface AlertPreferencesProps {
  userId: string;
  preferences: AlertPreferencesType;
  onUpdatePreferences: (preferences: Partial<AlertPreferencesType>) => Promise<void>;
}

export const AlertPreferences: React.FC<AlertPreferencesProps> = ({
  preferences,
  onUpdatePreferences,
}) => {
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleToggle = async (
    key: keyof AlertPreferencesType,
    value: boolean
  ) => {
    setIsUpdating(true);
    try {
      const updated = { ...localPreferences, [key]: value };
      setLocalPreferences(updated);
      await onUpdatePreferences({ [key]: value });
    } catch {
      // Revert on error
      setLocalPreferences(preferences);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAlertTypeToggle = async (type: AlertType, enabled: boolean) => {
    setIsUpdating(true);
    try {
      const updated = {
        ...localPreferences,
        alertTypes: {
          ...localPreferences.alertTypes,
          [type]: enabled,
        },
      };
      setLocalPreferences(updated);
      await onUpdatePreferences({
        alertTypes: { ...localPreferences.alertTypes, [type]: enabled },
      });
    } catch {
      setLocalPreferences(preferences);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuietHoursToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const updated = {
        ...localPreferences,
        quietHours: {
          ...localPreferences.quietHours,
          enabled,
        },
      };
      setLocalPreferences(updated);
      await onUpdatePreferences({
        quietHours: { ...localPreferences.quietHours, enabled },
      });
    } catch {
      setLocalPreferences(preferences);
    } finally {
      setIsUpdating(false);
    }
  };

  const alertTypeLabels: Record<AlertType, string> = {
    sowing: 'Sowing Reminders',
    fertilizer: 'Fertilizer Application',
    irrigation: 'Irrigation Reminders',
    pest_control: 'Pest Control',
    harvest: 'Harvest Reminders',
    weather: 'Weather Alerts',
    scheme: 'Scheme Deadlines',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Channels</Text>
        
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={styles.preferenceLabel}>SMS Notifications</Text>
            <Text style={styles.preferenceDescription}>
              Receive alerts via SMS when app is not active
            </Text>
          </View>
          <Switch
            value={localPreferences.enableSMS}
            onValueChange={(value) => handleToggle('enableSMS', value)}
            disabled={isUpdating}
          />
        </View>

        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={styles.preferenceLabel}>Push Notifications</Text>
            <Text style={styles.preferenceDescription}>
              Receive in-app push notifications
            </Text>
          </View>
          <Switch
            value={localPreferences.enablePushNotifications}
            onValueChange={(value) => handleToggle('enablePushNotifications', value)}
            disabled={isUpdating}
          />
        </View>

        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={styles.preferenceLabel}>Voice Notifications</Text>
            <Text style={styles.preferenceDescription}>
              Hear alerts read aloud when app is active
            </Text>
          </View>
          <Switch
            value={localPreferences.enableVoiceNotifications}
            onValueChange={(value) => handleToggle('enableVoiceNotifications', value)}
            disabled={isUpdating}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={styles.preferenceLabel}>Enable Quiet Hours</Text>
            <Text style={styles.preferenceDescription}>
              No alerts during: {localPreferences.quietHours.start} - {localPreferences.quietHours.end}
            </Text>
          </View>
          <Switch
            value={localPreferences.quietHours.enabled}
            onValueChange={handleQuietHoursToggle}
            disabled={isUpdating}
          />
        </View>

        {localPreferences.quietHours.enabled && (
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Quiet Hours</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Types</Text>
        <Text style={styles.sectionDescription}>
          Choose which types of alerts you want to receive
        </Text>

        {(Object.keys(alertTypeLabels) as AlertType[]).map((type) => (
          <View key={type} style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>
                {alertTypeLabels[type]}
              </Text>
            </View>
            <Switch
              value={localPreferences.alertTypes[type]}
              onValueChange={(value) => handleAlertTypeToggle(type, value)}
              disabled={isUpdating}
            />
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Changes are saved automatically
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
