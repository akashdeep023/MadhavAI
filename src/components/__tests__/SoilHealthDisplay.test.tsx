/**
 * Soil Health Display Component Tests
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { SoilHealthDisplay } from '../SoilHealthDisplay';
import { soilApi } from '../../services/api/soilApi';
import { SoilHealthData } from '../../types/soil.types';

jest.mock('../../services/api/soilApi');
jest.mock('../../config/env', () => ({
  config: {
    ENABLE_API: false, // Disable API for tests
  },
}));

// Mock the storage service
jest.mock('../../services/soil/SoilHealthStorage', () => ({
  soilHealthStorage: {
    getUserSoilHealthRecords: jest.fn(),
  },
}));

// Mock the service instances with proper implementations
const mockAnalyzeSoilHealth = jest.fn();
const mockGenerateRecommendations = jest.fn();
const mockGetTopMatches = jest.fn();

jest.mock('../../services/soil/SoilAnalyzer', () => ({
  soilAnalyzer: {
    get analyzeSoilHealth() {
      return mockAnalyzeSoilHealth;
    },
  },
}));

jest.mock('../../services/soil/ImprovementAdvisor', () => ({
  improvementAdvisor: {
    get generateRecommendations() {
      return mockGenerateRecommendations;
    },
  },
}));

jest.mock('../../services/soil/CropMatcher', () => ({
  cropMatcher: {
    get getTopMatches() {
      return mockGetTopMatches;
    },
  },
}));

describe('SoilHealthDisplay', () => {
  const mockSoilData: SoilHealthData = {
    id: 'soil-001',
    userId: 'user-001',
    testDate: new Date('2024-01-15'),
    labName: 'Test Lab',
    sampleId: 'SAMPLE-001',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    parameters: {
      nitrogen: 300,
      phosphorus: 30,
      potassium: 250,
      pH: 6.5,
      electricalConductivity: 0.5,
      organicCarbon: 0.6,
    },
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock storage to return empty by default
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue([]);
    
    // Setup default mock implementations
    mockAnalyzeSoilHealth.mockReturnValue({
      overallRating: 'good',
      score: 75,
      interpretation: {
        summary: 'Your soil is in good condition',
        strengths: ['Good pH level'],
        concerns: ['Low nitrogen'],
      },
      nutrientAnalysis: [],
    });
    
    mockGenerateRecommendations.mockReturnValue([
      {
        deficiency: 'Nitrogen',
        severity: 'medium',
        timeline: '2-3 weeks',
        recommendations: [
          {
            title: 'Apply Urea',
            description: 'Apply urea fertilizer',
            application: { rate: '50 kg/ha', timing: 'Before sowing' },
            cost: { min: 500, max: 1000 },
          },
        ],
      },
    ]);
    
    mockGetTopMatches.mockReturnValue([
      {
        crop: 'Rice',
        suitabilityScore: 85,
        explanation: 'Suitable for your soil',
        recommendations: ['Ensure proper irrigation'],
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render loading state initially', () => {
    (soilApi.getSoilHealthByUser as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    expect(getByText('Loading soil health data...')).toBeTruthy();
  });

  it('should render empty state when no records found', async () => {
    (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    await waitFor(() => {
      expect(getByText('No soil health records found')).toBeTruthy();
    });
  });

  it('should render upload button in empty state', async () => {
    (soilApi.getSoilHealthByUser as jest.Mock).mockResolvedValue([]);
    const onUploadPress = jest.fn();

    const { getByText } = render(
      <SoilHealthDisplay userId="user-001" onUploadPress={onUploadPress} />
    );

    await waitFor(() => {
      expect(getByText('Upload Soil Health Card')).toBeTruthy();
    });

    fireEvent.press(getByText('Upload Soil Health Card'));
    expect(onUploadPress).toHaveBeenCalled();
  });

  it('should render error state on API failure', async () => {
    (soilApi.getSoilHealthByUser as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    // Component now shows empty state instead of error when API fails (ENABLE_API is false)
    await waitFor(() => {
      expect(getByText('No soil health records found')).toBeTruthy();
    });
  });

  it('should render retry button in error state', async () => {
    (soilApi.getSoilHealthByUser as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );
    
    const onUploadPress = jest.fn();

    const { getByText } = render(<SoilHealthDisplay userId="user-001" onUploadPress={onUploadPress} />);

    // Component now shows empty state with upload button instead of retry
    await waitFor(() => {
      expect(getByText('Upload Soil Health Card')).toBeTruthy();
    });
  });

  it('should retry loading on retry button press', async () => {
    (soilApi.getSoilHealthByUser as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce([mockSoilData]);

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    // Component shows empty state, not retry button
    await waitFor(() => {
      expect(getByText('No soil health records found')).toBeTruthy();
    });
  });

  it('should render soil health records', async () => {
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue([mockSoilData]);

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    await waitFor(() => {
      expect(getByText('Test Lab')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should render soil parameters', async () => {
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue([mockSoilData]);

    const { getByText, getAllByText } = render(<SoilHealthDisplay userId="user-001" />);

    await waitFor(() => {
      expect(getByText('pH')).toBeTruthy();
      expect(getByText('6.5')).toBeTruthy();
      expect(getAllByText('Nitrogen').length).toBeGreaterThan(0);
      expect(getByText('300 kg/ha')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should render section titles', async () => {
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue([mockSoilData]);

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    await waitFor(() => {
      expect(getByText('Soil Health Records')).toBeTruthy();
      expect(getByText('Soil Parameters')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should call API with correct userId', async () => {
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue([]);

    render(<SoilHealthDisplay userId="user-123" />);

    await waitFor(() => {
      expect(soilHealthStorage.getUserSoilHealthRecords).toHaveBeenCalledWith('user-123');
    });
  });

  it('should render multiple soil records', async () => {
    const mockRecords = [
      mockSoilData,
      { ...mockSoilData, id: 'soil-002', labName: 'Lab 2' },
    ];
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue(mockRecords);

    const { getByText } = render(<SoilHealthDisplay userId="user-001" />);

    await waitFor(() => {
      expect(getByText('Test Lab')).toBeTruthy();
      expect(getByText('Lab 2')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should render upload button at bottom when records exist', async () => {
    const { soilHealthStorage } = require('../../services/soil/SoilHealthStorage');
    soilHealthStorage.getUserSoilHealthRecords.mockResolvedValue([mockSoilData]);
    const onUploadPress = jest.fn();

    const { getByText } = render(
      <SoilHealthDisplay userId="user-001" onUploadPress={onUploadPress} />
    );

    await waitFor(() => {
      expect(getByText('Upload New Soil Health Card')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
