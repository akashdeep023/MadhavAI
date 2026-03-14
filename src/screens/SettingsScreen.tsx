/**
 * Settings Screen
 * User settings including language preference, profile info, and logout
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getLanguageNativeName } from '../utils/languageMapper';
import { authenticationManager } from '../services/auth/AuthenticationManager';
import { profileManager } from '../services/profile/ProfileManager';
import { encryptedStorage } from '../services/storage/EncryptedStorage';
import { logger } from '../utils/logger';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { t, language } = useTranslation();
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await profileManager.getProfile();
      setUserProfile(profile);
    } catch (error) {
      logger.error('Failed to load user profile', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);

            const authToken = await encryptedStorage.getItem<string>('auth_token');
            if (authToken) {
              await authenticationManager.logout(authToken);
            }

            await encryptedStorage.removeItem('auth_token');
            await encryptedStorage.removeItem('current_user_id');
            await profileManager.deleteProfile();

            logger.info('User logged out successfully');

            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (error) {
            logger.error('Logout failed', error);
            Alert.alert(t('common.error'), t('errors.tryAgain'));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    Alert.alert(t('settings.comingSoon'), t('settings.editProfile'));
  };

  const handleAbout = () => {
    Alert.alert(t('settings.about'), 'MADHAV AI v1.0.0');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      {userProfile && (
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileIconText}>
              {userProfile.name?.charAt(0).toUpperCase() || '👤'}
            </Text>
          </View>
          <Text style={styles.profileName}>{userProfile.name || 'User'}</Text>
          <Text style={styles.profilePhone}>{userProfile.mobileNumber || ''}</Text>
          <Text style={styles.profileLocation}>
            {userProfile.location?.village}, {userProfile.location?.district}
          </Text>
        </View>
      )}

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>

        <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>👤</Text>
            <Text style={styles.settingLabel}>{t('settings.editProfile')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageSwitcher(true)}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🌐</Text>
            <Text style={styles.settingLabel}>{t('settings.language')}</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.currentLanguage}>{getLanguageNativeName(language)}</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP SETTINGS</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            Alert.alert('Coming Soon', 'Notification settings will be available soon.')
          }
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => Alert.alert(t('settings.comingSoon'), '')}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔄</Text>
            <Text style={styles.settingLabel}>{t('settings.dataSync')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => Alert.alert(t('settings.comingSoon'), '')}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>❓</Text>
            <Text style={styles.settingLabel}>Help & Support</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleAbout}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>ℹ️</Text>
            <Text style={styles.settingLabel}>{t('settings.about')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => Alert.alert(t('settings.privacy'), '')}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔒</Text>
            <Text style={styles.settingLabel}>{t('settings.privacy')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>
            {loading ? t('auth.loggingOut') : t('auth.logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>MADHAV AI v1.0.0</Text>
        <Text style={styles.versionSubtext}>Farmer Decision Support Platform</Text>
      </View>

      {/* Language Switcher Modal */}
      <LanguageSwitcher
        visible={showLanguageSwitcher}
        onClose={() => setShowLanguageSwitcher(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileSection: {
    backgroundColor: '#4CAF50',
    padding: 32,
    alignItems: 'center',
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileIconText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    marginTop: 20,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    padding: 16,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLanguage: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  logoutIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
  },
  versionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#bbb',
  },
});

export default SettingsScreen;
