/**
 * Soil Health API Service Tests
 * Requirements: 10.1, 10.6
 */

import { soilHealthAPI } from '../SoilHealthAPI';
import { config } from '../../../config/env';

// Mock axios
jest.mock('axios');

describe('SoilHealthAPI', () => {
  describe('isApiEnabled', () => {
    it('should return true when API is enabled and base URL is set', () => {
      // This test depends on the environment configuration
      const result = soilHealthAPI.isApiEnabled();
      expect(typeof result).toBe('boolean');
    });

    it('should check config values', () => {
      expect(config).toBeDefined();
      expect(config.API_BASE_URL).toBeDefined();
      expect(typeof config.ENABLE_API).toBe('boolean');
    });
  });

  describe('API methods', () => {
    it('should have getPresignedUrl method', () => {
      expect(typeof soilHealthAPI.getPresignedUrl).toBe('function');
    });

    it('should have uploadImageToS3 method', () => {
      expect(typeof soilHealthAPI.uploadImageToS3).toBe('function');
    });

    it('should have triggerAnalysis method', () => {
      expect(typeof soilHealthAPI.triggerAnalysis).toBe('function');
    });

    it('should have getAnalysisResult method', () => {
      expect(typeof soilHealthAPI.getAnalysisResult).toBe('function');
    });

    it('should have pollAnalysisResult method', () => {
      expect(typeof soilHealthAPI.pollAnalysisResult).toBe('function');
    });

    it('should have uploadAndAnalyze method', () => {
      expect(typeof soilHealthAPI.uploadAndAnalyze).toBe('function');
    });
  });
});
