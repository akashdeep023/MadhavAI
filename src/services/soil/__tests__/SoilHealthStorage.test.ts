/**
 * Soil Health Storage Tests
 * Requirements: 10.7
 */

import { soilHealthStorage } from '../SoilHealthStorage';
import { SoilHealthData } from '../../../types/soil.types';
import { encryptedStorage } from '../../storage/EncryptedStorage';

// Mock encrypted storage
jest.mock('../../storage/EncryptedStorage', () => ({
  encryptedStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('SoilHealthStorage', () => {
  const mockSoilData: SoilHealthData = {
    id: 'soil123',
    userId: 'user123',
    testDate: new Date('2024-01-15'),
    labName: 'Test Lab',
    sampleId: 'SHC-001',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    parameters: {
      nitrogen: 300,
      phosphorus: 30,
      potassium: 300,
      pH: 6.5,
      electricalConductivity: 0.8,
      organicCarbon: 0.8,
    },
    soilType: 'loamy',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveSoilHealth', () => {
    it('should save soil health record', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await soilHealthStorage.saveSoilHealth(mockSoilData);

      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        'soil_health_soil123',
        mockSoilData
      );
      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        'soil_health_index',
        expect.any(Object)
      );
    });

    it('should update index when saving', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await soilHealthStorage.saveSoilHealth(mockSoilData);

      const indexCall = (encryptedStorage.setItem as jest.Mock).mock.calls.find(
        (call) => call[0] === 'soil_health_index'
      );

      expect(indexCall).toBeDefined();
      const indexData = indexCall[1];
      expect(indexData.user123).toContain('soil123');
    });

    it('should throw error on save failure', async () => {
      (encryptedStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(soilHealthStorage.saveSoilHealth(mockSoilData)).rejects.toThrow(
        'Failed to save soil health record'
      );
    });
  });

  describe('getSoilHealth', () => {
    it('should retrieve soil health record by ID', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockSoilData);

      const result = await soilHealthStorage.getSoilHealth('soil123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('soil123');
      expect(result?.userId).toBe('user123');
      expect(result?.testDate).toBeInstanceOf(Date);
    });

    it('should return null if record not found', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await soilHealthStorage.getSoilHealth('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on retrieval error', async () => {
      (encryptedStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await soilHealthStorage.getSoilHealth('soil123');

      expect(result).toBeNull();
    });
  });

  describe('getUserSoilHealthRecords', () => {
    it('should retrieve all records for a user', async () => {
      const index = { user123: ['soil123', 'soil456'] };
      const soil1 = { ...mockSoilData, id: 'soil123', testDate: new Date('2024-01-15') };
      const soil2 = { ...mockSoilData, id: 'soil456', testDate: new Date('2024-01-10') };

      (encryptedStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'soil_health_index') return Promise.resolve(index);
        if (key === 'soil_health_soil123') return Promise.resolve(soil1);
        if (key === 'soil_health_soil456') return Promise.resolve(soil2);
        return Promise.resolve(null);
      });

      const result = await soilHealthStorage.getUserSoilHealthRecords('user123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('soil123'); // Most recent first
      expect(result[1].id).toBe('soil456');
    });

    it('should return empty array if no records found', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await soilHealthStorage.getUserSoilHealthRecords('user123');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (encryptedStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await soilHealthStorage.getUserSoilHealthRecords('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getLatestSoilHealth', () => {
    it('should retrieve most recent soil health record', async () => {
      const index = { user123: ['soil123', 'soil456'] };
      const soil1 = { ...mockSoilData, id: 'soil123', testDate: new Date('2024-01-15') };
      const soil2 = { ...mockSoilData, id: 'soil456', testDate: new Date('2024-01-10') };

      (encryptedStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'soil_health_index') return Promise.resolve(index);
        if (key === 'soil_health_soil123') return Promise.resolve(soil1);
        if (key === 'soil_health_soil456') return Promise.resolve(soil2);
        return Promise.resolve(null);
      });

      const result = await soilHealthStorage.getLatestSoilHealth('user123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('soil123'); // Most recent
    });

    it('should return null if no records exist', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await soilHealthStorage.getLatestSoilHealth('user123');

      expect(result).toBeNull();
    });
  });

  describe('updateSoilHealth', () => {
    it('should update soil health record', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue({ user123: ['soil123'] });
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const updatedData = { ...mockSoilData, parameters: { ...mockSoilData.parameters, pH: 7.0 } };

      await soilHealthStorage.updateSoilHealth(updatedData);

      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        'soil_health_soil123',
        expect.any(Object)
      );
    });

    it('should update updatedAt timestamp', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue({ user123: ['soil123'] });
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const originalDate = mockSoilData.updatedAt;
      await soilHealthStorage.updateSoilHealth(mockSoilData);

      expect(mockSoilData.updatedAt.getTime()).toBeGreaterThanOrEqual(originalDate.getTime());
    });
  });

  describe('deleteSoilHealth', () => {
    it('should delete soil health record', async () => {
      const index = { user123: ['soil123', 'soil456'] };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(index);
      (encryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await soilHealthStorage.deleteSoilHealth('soil123', 'user123');

      expect(encryptedStorage.removeItem).toHaveBeenCalledWith('soil_health_soil123');
      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        'soil_health_index',
        expect.any(Object)
      );
    });

    it('should remove record from index', async () => {
      const index = { user123: ['soil123', 'soil456'] };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(index);
      (encryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await soilHealthStorage.deleteSoilHealth('soil123', 'user123');

      const indexCall = (encryptedStorage.setItem as jest.Mock).mock.calls.find(
        (call) => call[0] === 'soil_health_index'
      );

      const updatedIndex = indexCall[1];
      expect(updatedIndex.user123).not.toContain('soil123');
      expect(updatedIndex.user123).toContain('soil456');
    });

    it('should throw error on delete failure', async () => {
      (encryptedStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(soilHealthStorage.deleteSoilHealth('soil123', 'user123')).rejects.toThrow(
        'Failed to delete soil health record'
      );
    });
  });

  describe('clearUserSoilHealthRecords', () => {
    it('should clear all records for a user', async () => {
      const index = { user123: ['soil123', 'soil456'] };
      const soil1 = { ...mockSoilData, id: 'soil123' };
      const soil2 = { ...mockSoilData, id: 'soil456' };

      (encryptedStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'soil_health_index') return Promise.resolve(index);
        if (key === 'soil_health_soil123') return Promise.resolve(soil1);
        if (key === 'soil_health_soil456') return Promise.resolve(soil2);
        return Promise.resolve(null);
      });
      (encryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await soilHealthStorage.clearUserSoilHealthRecords('user123');

      expect(encryptedStorage.removeItem).toHaveBeenCalledWith('soil_health_soil123');
      expect(encryptedStorage.removeItem).toHaveBeenCalledWith('soil_health_soil456');
    });

    it('should throw error on clear failure', async () => {
      const index = { user123: ['soil123'] };
      const soil1 = { ...mockSoilData, id: 'soil123' };

      (encryptedStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'soil_health_index') return Promise.resolve(index);
        if (key === 'soil_health_soil123') return Promise.resolve(soil1);
        return Promise.resolve(null);
      });
      (encryptedStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(soilHealthStorage.clearUserSoilHealthRecords('user123')).rejects.toThrow(
        'Failed to delete soil health record'
      );
    });
  });
});
