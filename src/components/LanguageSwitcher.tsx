/**
 * Language Switcher Component
 * Allows users to change their language preference
 */

import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Modal, StyleSheet, FlatList} from 'react-native';
import {LanguageCode} from '../types/translation.types';
import {SUPPORTED_LANGUAGES} from '../config/constants';
import {useTranslation} from '../hooks/useTranslation';

interface LanguageSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({visible, onClose}) => {
  const {language: currentLanguage, setLanguage} = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    try {
      setIsChanging(true);
      await setLanguage(languageCode);
      onClose();
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Language / भाषा चुनें</Text>
          
          <FlatList
            data={SUPPORTED_LANGUAGES}
            keyExtractor={item => item.code}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  currentLanguage === item.code && styles.selectedLanguage,
                ]}
                onPress={() => handleLanguageSelect(item.code as LanguageCode)}
                disabled={isChanging}>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{item.name}</Text>
                  <Text style={styles.nativeName}>{item.nativeName}</Text>
                </View>
                {currentLanguage === item.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isChanging}>
            <Text style={styles.closeButtonText}>Close / बंद करें</Text>
          </TouchableOpacity>
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
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedLanguage: {
    backgroundColor: '#e3f2fd',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  nativeName: {
    fontSize: 18,
    color: '#666',
  },
  checkmark: {
    fontSize: 24,
    color: '#2196f3',
  },
  closeButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#2196f3',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LanguageSwitcher;
