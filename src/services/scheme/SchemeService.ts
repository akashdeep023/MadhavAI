/**
 * Scheme Service
 * Requirements: 2.1, 2.7
 *
 * Manages government scheme data including fetching, caching, and local storage
 */

import { Scheme } from '../../types/scheme.types';
import { logger } from '../../utils/logger';
import { encryptedStorage } from '../storage/EncryptedStorage';
import { config } from '../../config/env';

interface SchemeCache {
  schemes: Scheme[];
  lastUpdated: Date;
}

export class SchemeService {
  private readonly CACHE_KEY = 'schemes_cache';
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Get all available schemes
   */
  async getAllSchemes(): Promise<Scheme[]> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedSchemes();
      if (cached && cached.length > 0) {
        logger.info(`Retrieved ${cached.length} schemes from cache`);
        return cached;
      }

      // If not in cache, fetch from API
      logger.info('Fetching schemes from API');
      const schemes = await this.fetchSchemesFromAPI();

      logger.info(`Fetched ${schemes.length} schemes from API`);

      // Cache the results
      if (schemes.length > 0) {
        await this.cacheSchemes(schemes);
      }

      return schemes;
    } catch (error) {
      logger.error('Failed to get schemes', error);

      // Try to return cached data even if expired
      const cached = await this.getCachedSchemes(true);
      if (cached && cached.length > 0) {
        logger.warn('Returning expired cached schemes due to API failure');
        return cached;
      }

      // Return empty array instead of throwing
      logger.warn('Returning empty schemes array');
      return [];
    }
  }

  /**
   * Get schemes filtered by user location
   */
  async getSchemesByLocation(state: string, district?: string): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();

    return allSchemes.filter((scheme) => {
      // Include schemes with no location restriction
      if (!scheme.state) {
        return true;
      }

      // Check state match
      if (scheme.state !== state) {
        return false;
      }

      // If district is specified, check district match
      if (district && scheme.district && scheme.district !== district) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get schemes by category
   */
  async getSchemesByCategory(category: string): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    return allSchemes.filter((scheme) => scheme.category === category);
  }

  /**
   * Get scheme by ID
   */
  async getSchemeById(schemeId: string): Promise<Scheme | null> {
    const allSchemes = await this.getAllSchemes();
    return allSchemes.find((scheme) => scheme.id === schemeId) || null;
  }

  /**
   * Get schemes with upcoming deadlines (within 30 days)
   */
  async getSchemesWithUpcomingDeadlines(daysAhead: number = 30): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return allSchemes.filter((scheme) => {
      if (!scheme.applicationDeadline) {
        return false;
      }

      const deadline = new Date(scheme.applicationDeadline);
      return deadline >= now && deadline <= futureDate;
    });
  }

  /**
   * Search schemes by keyword
   */
  async searchSchemes(keyword: string): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    const lowerKeyword = keyword.toLowerCase();

    return allSchemes.filter((scheme) => {
      return (
        scheme.name.toLowerCase().includes(lowerKeyword) ||
        scheme.description.toLowerCase().includes(lowerKeyword) ||
        scheme.benefits.some((benefit) => benefit.toLowerCase().includes(lowerKeyword))
      );
    });
  }

  /**
   * Fetch schemes from API
   */
  private async fetchSchemesFromAPI(): Promise<Scheme[]> {
    try {
      const apiBaseUrl = config.API_BASE_URL;

      if (!apiBaseUrl) {
        logger.warn('API not configured, using fallback mock data');
        return this.getFallbackSchemes();
      }

      logger.info('Fetching schemes from API');
      const response = await fetch(`${apiBaseUrl}/schemes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const schemes = data.schemes || [];

      // Convert date strings to Date objects
      return schemes.map((scheme: any) => ({
        ...scheme,
        applicationDeadline: scheme.applicationDeadline
          ? new Date(scheme.applicationDeadline)
          : undefined,
        createdAt: new Date(scheme.createdAt),
        updatedAt: new Date(scheme.updatedAt),
      }));
    } catch (error) {
      logger.error('Failed to fetch schemes from API, using fallback data', error);
      return this.getFallbackSchemes();
    }
  }

  /**
   * Get fallback schemes (used when API is unavailable)
   */
  private getFallbackSchemes(): Scheme[] {
    logger.info('Using fallback government scheme data');

    const mockSchemes: Scheme[] = [
      {
        id: 'pm-kisan-2024',
        name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        description:
          'Direct income support of ₹6,000 per year to all farmer families across the country in three equal installments of ₹2,000 each.',
        category: 'subsidy',
        eligibilityCriteria: {
          maxFarmSize: 10,
          landOwnership: ['owned'],
          farmerCategory: ['small', 'marginal', 'medium'],
        },
        benefits: [
          '₹6,000 per year in three installments',
          'Direct bank transfer',
          'No paperwork required after registration',
        ],
        applicationDeadline: new Date('2024-12-31'),
        applicationUrl: 'https://pmkisan.gov.in/',
        requiredDocuments: [
          'Aadhaar Card',
          'Bank Account Details',
          'Land Ownership Documents',
          'Mobile Number',
        ],
        applicationSteps: [
          {
            stepNumber: 1,
            title: 'Visit PM-KISAN Portal',
            description:
              'Go to the official PM-KISAN website or visit your nearest Common Service Center (CSC).',
            estimatedTime: '10 minutes',
          },
          {
            stepNumber: 2,
            title: 'Fill Registration Form',
            description: 'Provide Aadhaar number, bank account details, and land records.',
            requiredDocuments: ['Aadhaar Card', 'Bank Passbook', 'Land Records'],
            estimatedTime: '15 minutes',
          },
          {
            stepNumber: 3,
            title: 'Submit Application',
            description:
              'Submit the form online or at CSC. You will receive a registration number.',
            estimatedTime: '5 minutes',
          },
          {
            stepNumber: 4,
            title: 'Verification',
            description:
              'Your application will be verified by local authorities within 15-30 days.',
            estimatedTime: '15-30 days',
          },
        ],
        contactInfo: {
          phone: '011-23382401',
          email: 'pmkisan-ict@gov.in',
          website: 'https://pmkisan.gov.in/',
        },
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'pmfby-2024',
        name: 'PMFBY (Pradhan Mantri Fasal Bima Yojana)',
        description:
          'Comprehensive crop insurance scheme providing financial support to farmers in case of crop loss due to natural calamities, pests, and diseases.',
        category: 'insurance',
        eligibilityCriteria: {
          farmerCategory: ['small', 'marginal', 'medium', 'large'],
          landOwnership: ['owned', 'leased', 'sharecropped'],
        },
        benefits: [
          'Coverage for all stages of crop cycle',
          'Low premium rates (2% for Kharif, 1.5% for Rabi)',
          'Quick claim settlement',
          'Coverage for post-harvest losses',
        ],
        applicationDeadline: new Date('2024-06-30'),
        applicationUrl: 'https://pmfby.gov.in/',
        requiredDocuments: [
          'Aadhaar Card',
          'Bank Account Details',
          'Land Records or Tenancy Agreement',
          'Sowing Certificate',
        ],
        applicationSteps: [
          {
            stepNumber: 1,
            title: 'Visit Bank or CSC',
            description:
              'Visit your bank branch, CSC, or insurance company office before sowing season.',
            estimatedTime: '30 minutes',
          },
          {
            stepNumber: 2,
            title: 'Fill Proposal Form',
            description: 'Complete the crop insurance proposal form with crop and land details.',
            requiredDocuments: ['Land Records', 'Bank Details'],
            estimatedTime: '20 minutes',
          },
          {
            stepNumber: 3,
            title: 'Pay Premium',
            description: 'Pay the subsidized premium amount (2% for Kharif, 1.5% for Rabi crops).',
            estimatedTime: '10 minutes',
          },
          {
            stepNumber: 4,
            title: 'Receive Policy',
            description: 'Get your insurance policy document and keep it safe.',
            estimatedTime: '1-2 days',
          },
        ],
        contactInfo: {
          phone: '011-23382012',
          email: 'pmfby-helpdesk@gov.in',
          website: 'https://pmfby.gov.in/',
        },
        state: 'Maharashtra',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'kcc-2024',
        name: 'Kisan Credit Card (KCC)',
        description:
          'Credit facility for farmers to meet their agricultural needs including crop cultivation, post-harvest expenses, and maintenance of farm assets.',
        category: 'loan',
        eligibilityCriteria: {
          farmerCategory: ['small', 'marginal', 'medium', 'large'],
          landOwnership: ['owned', 'leased'],
        },
        benefits: [
          'Credit limit up to ₹3 lakh at 7% interest',
          'Flexible repayment terms',
          'Insurance coverage included',
          'No collateral required for loans up to ₹1.6 lakh',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'PAN Card',
          'Land Ownership Documents',
          'Bank Account Statement',
          'Passport Size Photos',
        ],
        applicationSteps: [
          {
            stepNumber: 1,
            title: 'Visit Bank Branch',
            description: 'Visit your nearest bank branch that offers KCC facility.',
            estimatedTime: '1 hour',
          },
          {
            stepNumber: 2,
            title: 'Submit Application',
            description: 'Fill KCC application form and submit required documents.',
            requiredDocuments: ['Aadhaar', 'PAN', 'Land Records', 'Photos'],
            estimatedTime: '30 minutes',
          },
          {
            stepNumber: 3,
            title: 'Field Verification',
            description: 'Bank will conduct field verification of your land and crops.',
            estimatedTime: '3-7 days',
          },
          {
            stepNumber: 4,
            title: 'Receive KCC',
            description: 'Once approved, you will receive your Kisan Credit Card.',
            estimatedTime: '7-15 days',
          },
        ],
        contactInfo: {
          phone: '1800-180-1111',
          email: 'kcc-support@nabard.org',
          website: 'https://www.nabard.org/kcc.aspx',
        },
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'pkvy-2024',
        name: 'PKVY (Paramparagat Krishi Vikas Yojana)',
        description:
          'Scheme to promote organic farming and certification. Provides financial assistance of ₹50,000 per hectare for 3 years for organic farming.',
        category: 'organic_farming',
        eligibilityCriteria: {
          farmerCategory: ['small', 'marginal', 'medium'],
          minFarmSize: 0.5,
        },
        benefits: [
          '₹50,000 per hectare over 3 years',
          'Organic certification support',
          'Training on organic farming practices',
          'Market linkage for organic produce',
        ],
        applicationDeadline: new Date('2024-08-31'),
        requiredDocuments: [
          'Aadhaar Card',
          'Land Ownership Documents',
          'Bank Account Details',
          'Group Formation Certificate (if applicable)',
        ],
        applicationSteps: [
          {
            stepNumber: 1,
            title: 'Form Farmer Group',
            description: 'Form a group of 50 farmers or join an existing organic farming group.',
            estimatedTime: '1-2 weeks',
          },
          {
            stepNumber: 2,
            title: 'Contact Agriculture Department',
            description: 'Contact your district agriculture office to register your group.',
            estimatedTime: '1 day',
          },
          {
            stepNumber: 3,
            title: 'Submit Proposal',
            description: 'Submit group proposal with land details and organic farming plan.',
            requiredDocuments: ['Group Certificate', 'Land Records', 'Farming Plan'],
            estimatedTime: '1 week',
          },
          {
            stepNumber: 4,
            title: 'Receive Approval',
            description: 'Once approved, receive financial assistance in installments.',
            estimatedTime: '1-2 months',
          },
        ],
        contactInfo: {
          phone: '011-23070271',
          email: 'pkvy@gov.in',
          website: 'https://pgsindia-ncof.gov.in/',
        },
        state: 'Maharashtra',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'smam-2024',
        name: 'SMAM (Sub-Mission on Agricultural Mechanization)',
        description:
          'Provides financial assistance for purchase of agricultural machinery and equipment. Subsidy of 40-50% on farm equipment.',
        category: 'equipment',
        eligibilityCriteria: {
          farmerCategory: ['small', 'marginal', 'medium', 'large'],
          minFarmSize: 1,
        },
        benefits: [
          '40-50% subsidy on farm equipment',
          'Priority to SC/ST/Women farmers (50% subsidy)',
          'Custom Hiring Centers support',
          'Training on equipment operation',
        ],
        applicationDeadline: new Date('2024-09-30'),
        requiredDocuments: [
          'Aadhaar Card',
          'Land Ownership Documents',
          'Bank Account Details',
          'Caste Certificate (if applicable)',
          'Quotation from Authorized Dealer',
        ],
        applicationSteps: [
          {
            stepNumber: 1,
            title: 'Register on Portal',
            description: 'Register on the state agriculture mechanization portal.',
            estimatedTime: '15 minutes',
          },
          {
            stepNumber: 2,
            title: 'Select Equipment',
            description:
              'Choose equipment from approved list and get quotation from authorized dealer.',
            estimatedTime: '1-2 days',
          },
          {
            stepNumber: 3,
            title: 'Submit Application',
            description: 'Submit online application with quotation and required documents.',
            requiredDocuments: ['Aadhaar', 'Land Records', 'Quotation'],
            estimatedTime: '30 minutes',
          },
          {
            stepNumber: 4,
            title: 'Purchase Equipment',
            description: 'After approval, purchase equipment and claim subsidy.',
            estimatedTime: '15-30 days',
          },
        ],
        contactInfo: {
          phone: '011-23389357',
          email: 'smam@gov.in',
          website: 'https://agrimachinery.nic.in/',
        },
        state: 'Maharashtra',
        district: 'Pune',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'pmksy-2024',
        name: 'PMKSY (Pradhan Mantri Krishi Sinchayee Yojana)',
        description:
          'Scheme to expand cultivable area under irrigation, improve water use efficiency, and promote precision irrigation (drip/sprinkler).',
        category: 'irrigation',
        eligibilityCriteria: {
          farmerCategory: ['small', 'marginal', 'medium', 'large'],
          minFarmSize: 0.5,
        },
        benefits: [
          'Subsidy on drip/sprinkler irrigation systems',
          'Support for water conservation structures',
          'Watershed development assistance',
          'Technical guidance on water management',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Land Ownership Documents',
          'Bank Account Details',
          'Water Source Certificate',
          'Soil Test Report',
        ],
        applicationSteps: [
          {
            stepNumber: 1,
            title: 'Soil and Water Testing',
            description: 'Get soil test and water availability assessment done.',
            estimatedTime: '1 week',
          },
          {
            stepNumber: 2,
            title: 'Visit Agriculture Office',
            description: 'Contact district agriculture or horticulture office.',
            estimatedTime: '1 day',
          },
          {
            stepNumber: 3,
            title: 'Submit Application',
            description: 'Submit application with land details and irrigation plan.',
            requiredDocuments: ['Land Records', 'Soil Test', 'Water Certificate'],
            estimatedTime: '1 day',
          },
          {
            stepNumber: 4,
            title: 'Installation and Subsidy',
            description: 'Install irrigation system through approved vendor and receive subsidy.',
            estimatedTime: '1-2 months',
          },
        ],
        contactInfo: {
          phone: '011-23070433',
          email: 'pmksy@gov.in',
          website: 'https://pmksy.gov.in/',
        },
        state: 'Maharashtra',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    logger.info(`Returning ${mockSchemes.length} mock schemes`);
    return mockSchemes;
  }

  /**
   * Get cached schemes
   */
  private async getCachedSchemes(ignoreExpiry: boolean = false): Promise<Scheme[] | null> {
    try {
      const cached = await encryptedStorage.getItem<SchemeCache>(this.CACHE_KEY);

      if (!cached) {
        logger.info('No cached schemes found');
        return null;
      }

      // Check if cache is expired
      if (!ignoreExpiry) {
        const now = new Date();
        const cacheAge = now.getTime() - new Date(cached.lastUpdated).getTime();

        if (cacheAge > this.CACHE_DURATION_MS) {
          logger.info('Scheme cache expired');
          return null;
        }
      }

      logger.info(`Retrieved ${cached.schemes.length} schemes from cache`);
      return cached.schemes;
    } catch (error) {
      logger.error('Failed to get cached schemes', error);
      return null;
    }
  }

  /**
   * Cache schemes
   */
  private async cacheSchemes(schemes: Scheme[]): Promise<void> {
    try {
      const cache: SchemeCache = {
        schemes,
        lastUpdated: new Date(),
      };

      await encryptedStorage.setItem(this.CACHE_KEY, cache);
      logger.info(`Cached ${schemes.length} schemes`);
    } catch (error) {
      logger.error('Failed to cache schemes', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Clear scheme cache
   */
  async clearCache(): Promise<void> {
    try {
      await encryptedStorage.removeItem(this.CACHE_KEY);
      logger.info('Scheme cache cleared');
    } catch (error) {
      logger.error('Failed to clear scheme cache', error);
    }
  }

  /**
   * Force refresh schemes from API
   */
  async refreshSchemes(): Promise<Scheme[]> {
    logger.info('Force refreshing schemes');
    await this.clearCache();
    return this.getAllSchemes();
  }

  /**
   * Check eligibility via API
   * Requirements: 2.2
   */
  async checkEligibilityViaAPI(schemeId: string, userProfile: any): Promise<any> {
    try {
      const apiBaseUrl = config.API_BASE_URL;

      if (!apiBaseUrl) {
        logger.warn('API disabled, eligibility check not available via API');
        return null;
      }

      logger.info(`Checking eligibility via API for scheme ${schemeId}`);
      const response = await fetch(`${apiBaseUrl}/schemes/check-eligibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schemeId,
          userProfile,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.eligibilityResult;
    } catch (error) {
      logger.error('Failed to check eligibility via API', error);
      return null;
    }
  }

  /**
   * Schedule deadline alerts for eligible schemes
   * Requirements: 2.6
   */
  async scheduleDeadlineAlertsForEligibleSchemes(
    userId: string,
    userProfile: any
  ): Promise<number> {
    try {
      logger.info(`Scheduling deadline alerts for user ${userId}`);

      // Get schemes with upcoming deadlines (within 30 days)
      const schemesWithDeadlines = await this.getSchemesWithUpcomingDeadlines(30);

      if (schemesWithDeadlines.length === 0) {
        logger.info('No schemes with upcoming deadlines');
        return 0;
      }

      const apiBaseUrl = config.API_BASE_URL;

      if (!apiBaseUrl) {
        logger.warn('API not configured, cannot schedule alerts');
        return 0;
      }

      let alertsScheduled = 0;

      // For each scheme, check eligibility and schedule alerts
      for (const scheme of schemesWithDeadlines) {
        try {
          // Check eligibility
          const eligibilityResult = await this.checkEligibilityViaAPI(scheme.id, userProfile);

          if (eligibilityResult && eligibilityResult.isEligible) {
            // Schedule deadline alerts (7, 3, 1 days before)
            const deadline = new Date(scheme.applicationDeadline!);
            const intervals = [7, 3, 1];

            for (const days of intervals) {
              const alertTime = new Date(deadline);
              alertTime.setDate(alertTime.getDate() - days);

              // Only schedule if alert time is in the future
              if (alertTime > new Date()) {
                const response = await fetch(`${apiBaseUrl}/alerts/schedule`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId,
                    type: 'scheme',
                    title: 'Scheme Deadline Reminder',
                    message: `${scheme.name} application deadline is in ${days} day${
                      days > 1 ? 's' : ''
                    }`,
                    scheduledTime: alertTime.toISOString(),
                    priority: days === 1 ? 'high' : 'medium',
                    actionable: true,
                    actionUrl: `/schemes/${scheme.id}`,
                    metadata: {
                      schemeId: scheme.id,
                      deadline: deadline.toISOString(),
                      daysRemaining: days,
                    },
                  }),
                });

                if (response.ok) {
                  alertsScheduled++;
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to process scheme ${scheme.id}`, error);
        }
      }

      logger.info(`Scheduled ${alertsScheduled} deadline alerts`);
      return alertsScheduled;
    } catch (error) {
      logger.error('Failed to schedule deadline alerts', error);
      return 0;
    }
  }
}

export const schemeService = new SchemeService();
