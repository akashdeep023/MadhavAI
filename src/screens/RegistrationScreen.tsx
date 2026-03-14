/**
 * RegistrationScreen
 * Handles new user profile creation after OTP verification
 * Requirements: 1.4, 1.5, 13.1, 13.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { profileManager } from '../services/profile/ProfileManager';
import { logger } from '../utils/logger';
import { useTranslation } from '../hooks/useTranslation';

interface RegistrationScreenProps {
  mobileNumber: string;
  onRegistrationComplete: () => void;
}

const SOIL_TYPES = ['loamy', 'clay', 'sandy', 'silt', 'red', 'black', 'alluvial'];
const COMMON_CROPS = [
  'wheat',
  'rice',
  'cotton',
  'sugarcane',
  'maize',
  'soybean',
  'pulses',
  'vegetables',
];

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

export default function RegistrationScreen({
  mobileNumber,
  onRegistrationComplete,
}: RegistrationScreenProps) {
  const { t, setLanguage } = useTranslation();
  const [step, setStep] = useState<'language' | 'profile'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [pincode, setPincode] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [soilType, setSoilType] = useState('loamy');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLanguageSelect = async (languageCode: string) => {
    setSelectedLanguage(languageCode);
    // Set the language preference
    await setLanguage(languageCode as any);
    // Move to profile step
    setStep('profile');
  };

  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter((c) => c !== crop));
    } else {
      setSelectedCrops([...selectedCrops, crop]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('registration.required'), t('registration.enterName'));
      return;
    }

    if (!state.trim() || !district.trim() || !village.trim()) {
      Alert.alert(t('registration.required'), t('registration.enterLocation'));
      return;
    }

    if (!pincode || pincode.length !== 6) {
      Alert.alert(t('registration.invalid'), t('registration.validPincode'));
      return;
    }

    if (!farmSize || parseFloat(farmSize) <= 0) {
      Alert.alert(t('registration.invalid'), t('registration.validFarmSize'));
      return;
    }

    if (selectedCrops.length === 0) {
      Alert.alert(t('registration.required'), t('registration.selectCrop'));
      return;
    }

    try {
      setLoading(true);
      logger.info('Creating user profile');

      await profileManager.createProfile({
        mobileNumber,
        name: name.trim(),
        location: {
          state: state.trim(),
          district: district.trim(),
          village: village.trim(),
          pincode: pincode.trim(),
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
        },
        farmSize: parseFloat(farmSize),
        primaryCrops: selectedCrops,
        soilType,
        languagePreference: selectedLanguage,
      });

      logger.info('Profile created successfully');
      Alert.alert(t('registration.success'), t('registration.profileCreated'), [
        { text: t('common.ok'), onPress: onRegistrationComplete },
      ]);
    } catch (error) {
      logger.error('Failed to create profile', error);
      Alert.alert(t('registration.error'), t('registration.profileFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Language Selection Step
  if (step === 'language') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>🌾</Text>
            <Text style={styles.title}>{t('registration.welcome')}</Text>
            <Text style={styles.subtitle}>{t('registration.selectLanguage')}</Text>
            <Text style={styles.subtitleSecondary}>अपनी पसंदीदा भाषा चुनें</Text>
          </View>

          <View style={styles.languageContainer}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageCard,
                  selectedLanguage === lang.code && styles.languageCardSelected,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.languageNative}>{lang.nativeName}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
                {selectedLanguage === lang.code && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Profile Form Step
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>🌾</Text>
          <Text style={styles.title}>{t('registration.completeProfile')}</Text>
          <Text style={styles.subtitle}>{t('registration.personalizeExperience')}</Text>
        </View>

        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('registration.fullName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('registration.enterName')}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Location</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Maharashtra"
                placeholderTextColor="#999"
                value={state}
                onChangeText={setState}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>District *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pune"
                placeholderTextColor="#999"
                value={district}
                onChangeText={setDistrict}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Village/Town *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter village or town name"
                placeholderTextColor="#999"
                value={village}
                onChangeText={setVillage}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pincode *</Text>
              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
                editable={!loading}
              />
            </View>
          </View>

          {/* Farm Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚜 Farm Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Farm Size (acres) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5.0"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={farmSize}
                onChangeText={setFarmSize}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Soil Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {SOIL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, soilType === type && styles.chipSelected]}
                      onPress={() => setSoilType(type)}
                      disabled={loading}
                    >
                      <Text style={[styles.chipText, soilType === type && styles.chipTextSelected]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Primary Crops * (Select at least one)</Text>
              <View style={styles.cropGrid}>
                {COMMON_CROPS.map((crop) => (
                  <TouchableOpacity
                    key={crop}
                    style={[
                      styles.cropChip,
                      selectedCrops.includes(crop) && styles.cropChipSelected,
                    ]}
                    onPress={() => toggleCrop(crop)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.cropChipText,
                        selectedCrops.includes(crop) && styles.cropChipTextSelected,
                      ]}
                    >
                      {selectedCrops.includes(crop) ? '✓ ' : ''}
                      {crop.charAt(0).toUpperCase() + crop.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('registration.submit')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('language')}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>← Change Language</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            * Required fields. You can update this information later in settings.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  subtitleSecondary: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  languageContainer: {
    padding: 16,
  },
  languageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  languageNative: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  languageName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  form: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  cropChipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  cropChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cropChipTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});
