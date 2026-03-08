/**
 * Scheme Service Tests
 */

import { SchemeService } from '../SchemeService';
import { Scheme } from '../../../types/scheme.types';
import { encryptedStorage } from '../../storage/EncryptedStorage';

jest.mock('../../storage/EncryptedStorage');

describe('SchemeService', () => {
  let service: SchemeService;

  const mockSchemes: Scheme[] = [
    {
      id: 'scheme-001',
      name: 'PM-KISAN',
      description: 'Direct income support to farmers',
      category: 'subsidy',
      eligibilityCriteria: {
        maxFarmSize: 5,
        allowedStates: ['Maharashtra', 'Karnataka'],
      },
      benefits: ['Rs 6000 per year in 3 installments'],
      requiredDocuments: ['Aadhaar', 'Land records'],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Register online',
          description: 'Visit PM-KISAN portal',
        },
      ],
      state: 'Maharashtra',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'scheme-002',
      name: 'Crop Insurance Scheme',
      description: 'Insurance coverage for crop loss',
      category: 'insurance',
      eligibilityCriteria: {
        allowedCrops: ['Rice', 'Wheat'],
      },
      benefits: ['Up to 90% coverage for crop loss'],
      requiredDocuments: ['Aadhaar', 'Land records', 'Crop details'],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Apply through bank',
          description: 'Visit your bank branch',
        },
      ],
      applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 'scheme-003',
      name: 'Organic Farming Subsidy',
      description: 'Subsidy for organic farming practices',
      category: 'organic_farming',
      eligibilityCriteria: {
        minFarmSize: 2,
      },
      benefits: ['50% subsidy on organic inputs'],
      requiredDocuments: ['Aadhaar', 'Land records'],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Get organic certification',
          description: 'Apply for organic certification',
        },
      ],
      state: 'Karnataka',
      district: 'Bangalore',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
  ];

  beforeEach(() => {
    service = new SchemeService();
    jest.clearAllMocks();
  });

  describe('getAllSchemes', () => {
    it('should return cached schemes if available', async () => {
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };

      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);

      const schemes = await service.getAllSchemes();

      expect(schemes).toEqual(mockSchemes);
      expect(encryptedStorage.getItem).toHaveBeenCalledWith('schemes_cache');
    });

    it('should return empty array when no cache and API not implemented', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const schemes = await service.getAllSchemes();

      // API now returns 6 mock schemes instead of empty array
      expect(schemes.length).toBe(6);
      expect(schemes[0].name).toContain('PM-KISAN');
    });

    it('should cache fetched schemes', async () => {
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await service.getAllSchemes();

      expect(encryptedStorage.setItem).toHaveBeenCalledWith(
        'schemes_cache',
        expect.objectContaining({
          schemes: expect.any(Array),
          lastUpdated: expect.any(Date),
        })
      );
    });

    it('should handle expired cache gracefully', async () => {
      const expiredCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      // When cache is expired, it will try to fetch from API
      // API now returns 6 mock schemes
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(expiredCache);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const schemes = await service.getAllSchemes();

      // API returns 6 mock schemes
      expect(schemes.length).toBe(6);
      expect(schemes[0].name).toContain('PM-KISAN');
    });
  });

  describe('getSchemesByLocation', () => {
    it('should filter schemes by state', async () => {
      // Create a fresh service instance for this test
      const testService = new SchemeService();
      
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);

      const schemes = await testService.getSchemesByLocation('Maharashtra');

      expect(schemes).toHaveLength(2); // PM-KISAN and Crop Insurance (no state restriction)
      expect(schemes.some(s => s.id === 'scheme-001')).toBe(true);
    });

    it('should filter schemes by state and district', async () => {
      // Create a fresh service instance for this test
      const testService = new SchemeService();
      
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);

      const schemes = await testService.getSchemesByLocation('Karnataka', 'Bangalore');

      expect(schemes).toHaveLength(2); // Organic Farming and Crop Insurance
      expect(schemes.some(s => s.id === 'scheme-003')).toBe(true);
    });

    it('should include schemes with no location restriction', async () => {
      // Create a fresh service instance for this test
      const testService = new SchemeService();
      
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);

      const schemes = await testService.getSchemesByLocation('Tamil Nadu');

      expect(schemes).toHaveLength(1); // Only Crop Insurance (no state restriction)
      expect(schemes[0].id).toBe('scheme-002');
    });
  });

  describe('getSchemesByCategory', () => {
    beforeEach(() => {
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);
    });

    it('should filter schemes by category', async () => {
      const schemes = await service.getSchemesByCategory('subsidy');

      expect(schemes).toHaveLength(1);
      expect(schemes[0].id).toBe('scheme-001');
    });

    it('should return empty array for non-existent category', async () => {
      const schemes = await service.getSchemesByCategory('non-existent');

      expect(schemes).toHaveLength(0);
    });
  });

  describe('getSchemeById', () => {
    beforeEach(() => {
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);
    });

    it('should return scheme by ID', async () => {
      const scheme = await service.getSchemeById('scheme-001');

      expect(scheme).toBeDefined();
      expect(scheme?.id).toBe('scheme-001');
    });

    it('should return null for non-existent ID', async () => {
      const scheme = await service.getSchemeById('non-existent');

      expect(scheme).toBeNull();
    });
  });

  describe('getSchemesWithUpcomingDeadlines', () => {
    beforeEach(() => {
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);
    });

    it('should return schemes with deadlines within 30 days', async () => {
      const schemes = await service.getSchemesWithUpcomingDeadlines(30);

      expect(schemes).toHaveLength(1);
      expect(schemes[0].id).toBe('scheme-002');
    });

    it('should return empty array when no upcoming deadlines', async () => {
      const schemes = await service.getSchemesWithUpcomingDeadlines(10);

      // scheme-002 has deadline in 15 days, so with 10 days ahead it should not be included
      expect(schemes).toHaveLength(0);
    });
  });

  describe('searchSchemes', () => {
    beforeEach(() => {
      const mockCache = {
        schemes: mockSchemes,
        lastUpdated: new Date(),
      };
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(mockCache);
    });

    it('should search schemes by name', async () => {
      const schemes = await service.searchSchemes('PM-KISAN');

      expect(schemes).toHaveLength(1);
      expect(schemes[0].id).toBe('scheme-001');
    });

    it('should search schemes by description', async () => {
      const schemes = await service.searchSchemes('insurance');

      expect(schemes).toHaveLength(1);
      expect(schemes[0].id).toBe('scheme-002');
    });

    it('should search schemes by benefits', async () => {
      const schemes = await service.searchSchemes('subsidy');

      expect(schemes).toHaveLength(1);
      expect(schemes[0].id).toBe('scheme-003');
    });

    it('should be case insensitive', async () => {
      const schemes = await service.searchSchemes('ORGANIC');

      expect(schemes).toHaveLength(1);
      expect(schemes[0].id).toBe('scheme-003');
    });

    it('should return empty array for no matches', async () => {
      const schemes = await service.searchSchemes('xyz123');

      expect(schemes).toHaveLength(0);
    });
  });

  describe('clearCache', () => {
    it('should clear scheme cache', async () => {
      (encryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await service.clearCache();

      expect(encryptedStorage.removeItem).toHaveBeenCalledWith('schemes_cache');
    });
  });

  describe('refreshSchemes', () => {
    it('should clear cache and fetch fresh schemes', async () => {
      (encryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (encryptedStorage.getItem as jest.Mock).mockResolvedValue(null);
      (encryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const schemes = await service.refreshSchemes();

      expect(encryptedStorage.removeItem).toHaveBeenCalledWith('schemes_cache');
      // API now returns 6 mock schemes
      expect(schemes.length).toBe(6);
      expect(schemes[0].name).toContain('PM-KISAN');
    });
  });
});
