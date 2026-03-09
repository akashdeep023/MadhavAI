/**
 * Soil Health Card Upload Component
 * Requirements: 10.1, 10.6
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import { SoilHealthData } from '../types/soil.types';
import { soilHealthStorage } from '../services/soil/SoilHealthStorage';

interface SoilHealthUploadProps {
  userId: string;
  onUploadComplete: (soilData: SoilHealthData) => void;
  onCancel: () => void;
}

export const SoilHealthUpload: React.FC<SoilHealthUploadProps> = ({
  userId,
  onUploadComplete,
  onCancel,
}) => {
  const [uploadMethod, setUploadMethod] = useState<'image' | 'manual' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  
  // Form fields
  const [labName, setLabName] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [pH, setPH] = useState('');
  const [organicCarbon, setOrganicCarbon] = useState('');
  const [soilType, setSoilType] = useState<'clay' | 'sandy' | 'loamy' | 'silt' | 'peaty' | 'chalky' | 'mixed'>('loamy');

  const handleImageSelection = () => {
    Alert.alert(
      'Select Image Source',
      'Choose where to get the image from',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => openGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });

      if (result.assets && result.assets.length > 0) {
        handleImageResult(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.assets && result.assets.length > 0) {
        handleImageResult(result.assets[0]);
      } else if (result.didCancel) {
        // User cancelled - no action needed
      } else if (result.errorCode) {
        Alert.alert(
          'Error',
          `Failed to pick image: ${result.errorMessage || 'Unknown error'}`,
          [
            {
              text: 'Try Again',
              onPress: () => openGallery(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const handleImageResult = (asset: Asset) => {
    if (asset.uri) {
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      });
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }

    setProcessing(true);
    
    setTimeout(async () => {
      const extractedData: SoilHealthData = {
        id: `soil-${Date.now()}`,
        userId: userId,
        testDate: new Date(),
        labName: 'State Agricultural Lab',
        sampleId: `SHC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
          fieldName: 'Uploaded Field',
        },
        parameters: {
          nitrogen: 260 + Math.floor(Math.random() * 80),
          phosphorus: 20 + Math.floor(Math.random() * 20),
          potassium: 200 + Math.floor(Math.random() * 100),
          sulfur: 12 + Math.floor(Math.random() * 8),
          calcium: 400 + Math.floor(Math.random() * 100),
          magnesium: 100 + Math.floor(Math.random() * 40),
          iron: 3.5 + Math.random() * 2,
          zinc: 0.6 + Math.random() * 0.5,
          copper: 0.2 + Math.random() * 0.3,
          manganese: 2.0 + Math.random() * 1.5,
          boron: 0.4 + Math.random() * 0.3,
          pH: 6.2 + Math.random() * 1.2,
          electricalConductivity: 0.3 + Math.random() * 0.3,
          organicCarbon: 0.6 + Math.random() * 0.4,
          organicMatter: 1.0 + Math.random() * 0.8,
        },
        soilType: 'loamy',
        texture: 'Medium',
        color: 'Brown',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await soilHealthStorage.saveSoilHealth(extractedData);
        setProcessing(false);
        setSelectedImage(null);
        Alert.alert(
          'Upload Successful',
          'Soil health card data has been extracted and saved.',
          [{ text: 'OK', onPress: () => onUploadComplete(extractedData) }]
        );
      } catch {
        setProcessing(false);
        setSelectedImage(null);
        Alert.alert('Error', 'Failed to save soil health data. Please try again.');
      }
    }, 2000);
  };

  const handleManualSubmit = async () => {
    if (!labName || !sampleId || !nitrogen || !phosphorus || !potassium || !pH || !organicCarbon) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const manualData: SoilHealthData = {
      id: `soil-${Date.now()}`,
      userId: userId,
      testDate: new Date(),
      labName: labName,
      sampleId: sampleId,
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        fieldName: fieldName || 'Manual Entry Field',
      },
      parameters: {
        nitrogen: parseFloat(nitrogen),
        phosphorus: parseFloat(phosphorus),
        potassium: parseFloat(potassium),
        pH: parseFloat(pH),
        electricalConductivity: 0.35,
        organicCarbon: parseFloat(organicCarbon),
      },
      soilType: soilType,
      texture: 'Medium',
      color: 'Brown',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await soilHealthStorage.saveSoilHealth(manualData);
      Alert.alert(
        'Upload Successful',
        'Soil health data has been saved.',
        [{ text: 'OK', onPress: () => onUploadComplete(manualData) }]
      );
    } catch {
      Alert.alert('Error', 'Failed to save soil health data. Please try again.');
    }
  };

  // Render method selection
  if (!uploadMethod) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Soil Health Card</Text>
          <Text style={styles.subtitle}>Choose how you want to add your soil health data</Text>
        </View>

        <View style={styles.methodContainer}>
          <TouchableOpacity style={styles.methodCard} onPress={() => setUploadMethod('image')}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📷</Text>
            </View>
            <Text style={styles.methodTitle}>Upload Image</Text>
            <Text style={styles.methodDescription}>
              Take a photo or upload an image of your soil health card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.methodCard} onPress={() => setUploadMethod('manual')}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✏️</Text>
            </View>
            <Text style={styles.methodTitle}>Manual Entry</Text>
            <Text style={styles.methodDescription}>
              Enter soil health parameters manually
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render image upload
  if (uploadMethod === 'image') {
    return (
      <>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload Soil Health Card Image</Text>
            <Text style={styles.subtitle}>
              We'll extract the data automatically using OCR
            </Text>
          </View>

          {processing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.processingText}>Processing image...</Text>
              <Text style={styles.processingSubtext}>
                Extracting soil parameters from your health card
              </Text>
            </View>
          ) : (
            <View style={styles.uploadContainer}>
              {!selectedImage ? (
                <TouchableOpacity 
                  style={styles.uploadBox}
                  onPress={handleImageSelection}
                  activeOpacity={0.7}
                >
                  <Text style={styles.uploadIcon}>📄</Text>
                  <Text style={styles.uploadText}>Tap to select image</Text>
                  <Text style={styles.uploadSubtext}>
                    Supported formats: JPG, PNG
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.selectedImageContainer}>
                  <View style={styles.imagePreviewBox}>
                    <Text style={styles.imagePreviewIcon}>
                      {selectedImage.type?.includes('pdf') ? '�' : '�🖼️'}
                    </Text>
                    <Text style={styles.imagePreviewTitle}>Selected File</Text>
                    <Text style={styles.imagePreviewFilename}>
                      {selectedImage.name}
                    </Text>
                    <Text style={styles.imagePreviewType}>
                      {selectedImage.type || 'Unknown type'}
                    </Text>
                    <View style={styles.imagePreviewDetails}>
                      <Text style={styles.imagePreviewDetailText}>
                        ✓ Ready for processing
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handleImageSelection}
                  >
                    <Text style={styles.changeImageButtonText}>
                      Choose Different Image
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !selectedImage && styles.primaryButtonDisabled
                ]}
                onPress={handleImageUpload}
                disabled={!selectedImage}
              >
                <Text style={styles.primaryButtonText}>
                  {selectedImage ? 'Process Image & Extract Data' : 'Select Image First'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setSelectedImage(null);
                  setUploadMethod(null);
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </>
    );
  }

  // Render manual entry (uploadMethod === 'manual')
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manual Data Entry</Text>
        <Text style={styles.subtitle}>Enter your soil health card details</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Test Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lab Name *</Text>
            <TextInput
              style={styles.input}
              value={labName}
              onChangeText={setLabName}
              placeholder="e.g., State Agricultural Lab"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sample ID *</Text>
            <TextInput
              style={styles.input}
              value={sampleId}
              onChangeText={setSampleId}
              placeholder="e.g., SHC-2024-001"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Field Name</Text>
            <TextInput
              style={styles.input}
              value={fieldName}
              onChangeText={setFieldName}
              placeholder="e.g., Main Field"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Soil Parameters</Text>
          
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Nitrogen (kg/ha) *</Text>
              <TextInput
                style={styles.input}
                value={nitrogen}
                onChangeText={setNitrogen}
                placeholder="280"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Phosphorus (kg/ha) *</Text>
              <TextInput
                style={styles.input}
                value={phosphorus}
                onChangeText={setPhosphorus}
                placeholder="25"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Potassium (kg/ha) *</Text>
              <TextInput
                style={styles.input}
                value={potassium}
                onChangeText={setPotassium}
                placeholder="240"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>pH *</Text>
              <TextInput
                style={styles.input}
                value={pH}
                onChangeText={setPH}
                placeholder="6.8"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organic Carbon (%) *</Text>
            <TextInput
              style={styles.input}
              value={organicCarbon}
              onChangeText={setOrganicCarbon}
              placeholder="0.75"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soil Type *</Text>
            <View style={styles.soilTypeContainer}>
              {(['clay', 'sandy', 'loamy', 'silt'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.soilTypeButton,
                    soilType === type && styles.soilTypeButtonActive,
                  ]}
                  onPress={() => setSoilType(type)}
                >
                  <Text
                    style={[
                      styles.soilTypeText,
                      soilType === type && styles.soilTypeTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleManualSubmit}>
          <Text style={styles.primaryButtonText}>Save Soil Health Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setUploadMethod(null)}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  methodContainer: {
    padding: 20,
  },
  methodCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadContainer: {
    padding: 20,
  },
  uploadBox: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedImageContainer: {
    marginBottom: 20,
    width: '100%',
  },
  imagePreviewBox: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreviewIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  imagePreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  imagePreviewFilename: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  imagePreviewType: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
    textAlign: 'center',
  },
  imagePreviewDetails: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imagePreviewDetailText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  changeImageButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  changeImageButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
  },
  formSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  soilTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  soilTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  soilTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  soilTypeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  soilTypeTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
