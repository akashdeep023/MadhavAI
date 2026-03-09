/**
 * Soil API Tests
 */

import axios from 'axios';
import { SoilHealthData, SoilAnalysis, SoilImprovement } from '../../../types/soil.types';

jest.mock('axios');

describe('SoilApi', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;
  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  let SoilApi: any;
  let soilApi: any;

  beforeAll(() => {
    mockAxios.create.mockReturnValue(mockAxiosInstance as any);
    // Import after mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const soilApiModule = require('../soilApi');
    SoilApi = soilApiModule.soilApi.constructor;
    soilApi = new SoilApi();
  });
  const mockSoilHealthData: SoilHealthData = {
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

  const mockAnalysis: SoilAnalysis = {
    soilHealthId: 'soil-001',
    overallRating: 'good',
    score: 85,
    interpretation: {
      summary: 'Good soil health',
      details: ['pH is optimal', 'Nutrients are adequate'],
    },
    nutrientStatus: [],
    deficiencies: [],
    excesses: [],
    recommendations: [],
    testAge: {
      days: 30,
      needsRetesting: false,
    },
    suitableCrops: [],
  };

  const mockImprovement: SoilImprovement = {
    soilHealthId: 'soil-001',
    deficiency: 'Nitrogen',
    severity: 'medium',
    recommendations: [],
    timeline: '2-4 weeks',
    priority: 'medium',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadSoilHealthCard', () => {
    it('should upload soil health card successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockSoilHealthData });

      const result = await soilApi.uploadSoilHealthCard({
        userId: 'user-001',
        textData: 'Sample soil data',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/soil/upload', {
        userId: 'user-001',
        textData: 'Sample soil data',
      });
      expect(result).toEqual(mockSoilHealthData);
    });

    it('should handle upload errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Upload failed'));

      await expect(
        soilApi.uploadSoilHealthCard({
          userId: 'user-001',
          textData: 'Sample soil data',
        })
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('getSoilHealthById', () => {
    it('should fetch soil health data by ID', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSoilHealthData });

      const result = await soilApi.getSoilHealthById('soil-001');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/soil/soil-001');
      expect(result).toEqual(mockSoilHealthData);
    });

    it('should handle fetch errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Not found'));

      await expect(soilApi.getSoilHealthById('soil-001')).rejects.toThrow('Not found');
    });
  });

  describe('getSoilHealthByUser', () => {
    it('should fetch all soil health records for a user', async () => {
      const mockRecords = [mockSoilHealthData];
      mockAxiosInstance.get.mockResolvedValue({ data: mockRecords });

      const result = await soilApi.getSoilHealthByUser('user-001');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/soil/user/user-001');
      expect(result).toEqual(mockRecords);
    });

    it('should return empty array when no records found', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await soilApi.getSoilHealthByUser('user-001');

      expect(result).toEqual([]);
    });
  });

  describe('analyzeSoilHealth', () => {
    it('should analyze soil health successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockAnalysis });

      const result = await soilApi.analyzeSoilHealth({ soilHealthId: 'soil-001' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/soil/analyze', {
        soilHealthId: 'soil-001',
      });
      expect(result).toEqual(mockAnalysis);
    });

    it('should handle analysis errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Analysis failed'));

      await expect(
        soilApi.analyzeSoilHealth({ soilHealthId: 'soil-001' })
      ).rejects.toThrow('Analysis failed');
    });
  });

  describe('getImprovements', () => {
    it('should fetch improvement recommendations', async () => {
      const mockImprovements = [mockImprovement];
      mockAxiosInstance.post.mockResolvedValue({ data: mockImprovements });

      const result = await soilApi.getImprovements({ soilHealthId: 'soil-001' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/soil/improvements', {
        soilHealthId: 'soil-001',
      });
      expect(result).toEqual(mockImprovements);
    });

    it('should return empty array when no improvements needed', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      const result = await soilApi.getImprovements({ soilHealthId: 'soil-001' });

      expect(result).toEqual([]);
    });
  });

  describe('getCropRecommendations', () => {
    it('should fetch crop recommendations', async () => {
      const mockRecommendations = [
        { crop: 'Rice', suitabilityScore: 90 },
        { crop: 'Wheat', suitabilityScore: 85 },
      ];
      mockAxiosInstance.post.mockResolvedValue({ data: mockRecommendations });

      const result = await soilApi.getCropRecommendations({ soilHealthId: 'soil-001' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/soil/crop-recommendations', {
        soilHealthId: 'soil-001',
      });
      expect(result).toEqual(mockRecommendations);
    });

    it('should support count parameter', async () => {
      const mockRecommendations = [{ crop: 'Rice', suitabilityScore: 90 }];
      mockAxiosInstance.post.mockResolvedValue({ data: mockRecommendations });

      await soilApi.getCropRecommendations({ soilHealthId: 'soil-001', count: 3 });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/soil/crop-recommendations', {
        soilHealthId: 'soil-001',
        count: 3,
      });
    });
  });

  describe('deleteSoilHealth', () => {
    it('should delete soil health record', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      await soilApi.deleteSoilHealth('soil-001');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/soil/soil-001');
    });

    it('should handle delete errors', async () => {
      mockAxiosInstance.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(soilApi.deleteSoilHealth('soil-001')).rejects.toThrow('Delete failed');
    });
  });
});
