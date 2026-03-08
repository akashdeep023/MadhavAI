# Soil Health Card Upload Feature

## Overview
The Soil Health Card Upload feature allows farmers to add new soil health data to the application through two methods:
1. **Image Upload** - Simulates OCR extraction from soil health card images
2. **Manual Entry** - Direct input of soil parameters

## Features

### 1. Image Upload (OCR Simulation)
- Simulates taking a photo or uploading an image of a soil health card
- Automatically extracts soil parameters using simulated OCR
- Generates realistic random values for demonstration
- Processing time: ~2 seconds

### 2. Manual Data Entry
- Form-based input for all soil parameters
- Required fields:
  - Lab Name
  - Sample ID
  - Nitrogen (kg/ha)
  - Phosphorus (kg/ha)
  - Potassium (kg/ha)
  - pH
  - Organic Carbon (%)
  - Soil Type (Clay, Sandy, Loamy, Silt)
- Optional fields:
  - Field Name

### 3. Data Storage
- Uses encrypted storage (`react-native-encrypted-storage`)
- Integrates with existing `SoilHealthStorage` service
- Automatically indexes records by user ID
- Persists data across app sessions

### 4. Data Display
- Uploaded records appear immediately in the soil health list
- Automatically sorted by test date (most recent first)
- Full analysis with:
  - Overall soil health rating
  - Nutrient status for all parameters
  - Suitable crop recommendations
  - Improvement recommendations

## How to Use

### For Users:
1. Navigate to the Soil Health screen
2. Click "Upload New Soil Health Card" button
3. Choose upload method:
   - **Upload Image**: Select an image file (simulated)
   - **Manual Entry**: Fill in the form with soil parameters
4. Review the uploaded data
5. View analysis, crop recommendations, and improvements

### For Developers:

#### Component Structure
```
src/
├── components/
│   ├── SoilHealthDisplay.tsx    # Main display component
│   └── SoilHealthUpload.tsx     # Upload modal component
├── screens/
│   └── SoilHealthScreen.tsx     # Screen wrapper
└── services/
    └── soil/
        └── SoilHealthStorage.ts # Storage service
```

#### Integration Example
```typescript
import { SoilHealthUpload } from '../components/SoilHealthUpload';

<Modal visible={showUpload}>
  <SoilHealthUpload
    userId="demo-user-001"
    onUploadComplete={() => {
      // Handle completion
      setShowUpload(false);
      refreshData();
    }}
    onCancel={() => setShowUpload(false)}
  />
</Modal>
```

## Data Flow

1. **Upload** → User enters data via image or manual form
2. **Validation** → Required fields are checked
3. **Storage** → Data saved to encrypted storage via `soilHealthStorage.saveSoilHealth()`
4. **Index Update** → User's soil health index is updated
5. **Display Refresh** → Component reloads and shows new record
6. **Analysis** → Automatic analysis using `SoilAnalyzer`, `ImprovementAdvisor`, and `CropMatcher`

## Mock Data
When no real data exists, the system provides two mock soil health records:
- **Mock Record 1**: Recent test (45 days ago) - Loamy soil with good parameters
- **Mock Record 2**: Older test (6 months ago) - Clay soil with lower parameters

## Technical Details

### Storage Keys
- Individual records: `soil_health_{recordId}`
- Index: `soil_health_index`

### Data Structure
```typescript
interface SoilHealthData {
  id: string;
  userId: string;
  testDate: Date;
  labName: string;
  sampleId: string;
  location: {
    latitude: number;
    longitude: number;
    fieldName?: string;
  };
  parameters: {
    nitrogen: number;      // kg/ha
    phosphorus: number;    // kg/ha
    potassium: number;     // kg/ha
    pH: number;
    organicCarbon: number; // %
    // ... other parameters
  };
  soilType: 'clay' | 'sandy' | 'loamy' | 'silt' | 'peaty' | 'chalky' | 'mixed';
  createdAt: Date;
  updatedAt: Date;
}
```

## Future Enhancements
1. Real image processing with OCR library
2. Camera integration for direct photo capture
3. Barcode/QR code scanning for sample IDs
4. Batch upload for multiple fields
5. Export functionality (PDF, CSV)
6. Comparison between multiple test results
7. Historical trend analysis
8. Integration with government soil health card databases

## Testing
To test the upload feature:
1. Run the app
2. Navigate to Soil Health screen
3. Click "Upload New Soil Health Card"
4. Try both upload methods:
   - Image upload (simulated)
   - Manual entry with sample data
5. Verify the new record appears in the list
6. Check that analysis is generated correctly
7. Restart the app to verify data persistence
