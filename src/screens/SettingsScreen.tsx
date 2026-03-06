/**
 * Settings Screen
 * User settings including language preference
 */

import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {useTranslation} from '../hooks/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {getLanguageNativeName} from '../utils/languageMapper';

const SettingsScreen: React.FC = () => {
  const {t, language} = useTranslation();
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('ui.profile.title')}</Text>

      {/* Language Setting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('ui.profile.language')}</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowLanguageSwitcher(true)}>
          <Text style={styles.settingLabel}>{t('ui.profile.language')}</Text>
          <View style={styles.settingValue}>
            <Text style={styles.currentLanguage}>
              {getLanguageNativeName(language)}
            </Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Other Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('ui.common.settings')}</Text>
        {/* Add more settings here */}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    backgroundColor: 'white',
  },
  section: {
    marginTop: 20,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingLabel: {
    fontSize: 16,
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
    color: '#999',
  },
});

export default SettingsScreen;
