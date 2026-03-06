/**
 * Translation Workflow Manager
 * Manages the workflow for new content translation and validation
 */

import {
  LanguageCode,
  TranslationCategory,
  TranslationContent,
  TranslationValidationResult,
} from '../../types/translation.types';
import {SUPPORTED_LANGUAGES} from '../../config/constants';
import TranslationContentManager from './TranslationContentManager';
import TranslationStorage from './TranslationStorage';

interface ContentReleaseRequest {
  category: TranslationCategory;
  contentId: string;
  baseLanguage: LanguageCode;
  content: TranslationContent;
  requiredLanguages?: LanguageCode[];
}

interface ContentReleaseResult {
  success: boolean;
  contentId: string;
  validationResult: TranslationValidationResult;
  releasedAt?: Date;
  errors: string[];
}

class TranslationWorkflowManager {
  private contentManager: TranslationContentManager;
  private storage: TranslationStorage;
  private pendingReleases: Map<string, ContentReleaseRequest> = new Map();

  constructor(contentManager: TranslationContentManager, storage: TranslationStorage) {
    this.contentManager = contentManager;
    this.storage = storage;
  }

  /**
   * Submit new content for translation
   */
  async submitForTranslation(request: ContentReleaseRequest): Promise<string> {
    const releaseId = `release_${Date.now()}_${request.contentId}`;
    
    // Store in pending releases
    this.pendingReleases.set(releaseId, request);

    // Store base language content immediately
    await this.storage.storeTranslations(
      request.baseLanguage,
      request.category,
      request.content
    );

    return releaseId;
  }

  /**
   * Add translation for a pending release
   */
  async addTranslation(
    releaseId: string,
    language: LanguageCode,
    translatedContent: TranslationContent
  ): Promise<void> {
    const request = this.pendingReleases.get(releaseId);
    
    if (!request) {
      throw new Error(`Release ${releaseId} not found`);
    }

    // Store the translation
    await this.storage.storeTranslations(
      language,
      request.category,
      translatedContent
    );
  }

  /**
   * Validate content before release
   */
  async validateForRelease(releaseId: string): Promise<TranslationValidationResult> {
    const request = this.pendingReleases.get(releaseId);
    
    if (!request) {
      throw new Error(`Release ${releaseId} not found`);
    }

    const requiredLanguages = request.requiredLanguages || 
      SUPPORTED_LANGUAGES.map(lang => lang.code as LanguageCode);

    const result: TranslationValidationResult = {
      isValid: true,
      missingKeys: [],
      missingLanguages: [],
      errors: [],
    };

    // Check each required language
    for (const language of requiredLanguages) {
      const hasTranslations = await this.storage.hasTranslations(
        language,
        request.category
      );

      if (!hasTranslations) {
        result.isValid = false;
        result.missingLanguages.push(language);
        result.errors.push(`Missing translation for language: ${language}`);
      }
    }

    return result;
  }

  /**
   * Release content after validation
   */
  async releaseContent(releaseId: string): Promise<ContentReleaseResult> {
    const request = this.pendingReleases.get(releaseId);
    
    if (!request) {
      return {
        success: false,
        contentId: '',
        validationResult: {
          isValid: false,
          missingKeys: [],
          missingLanguages: [],
          errors: ['Release not found'],
        },
        errors: ['Release not found'],
      };
    }

    // Validate before release
    const validationResult = await this.validateForRelease(releaseId);

    if (!validationResult.isValid) {
      return {
        success: false,
        contentId: request.contentId,
        validationResult,
        errors: validationResult.errors,
      };
    }

    // Mark as released
    const releasedAt = new Date();
    this.pendingReleases.delete(releaseId);

    return {
      success: true,
      contentId: request.contentId,
      validationResult,
      releasedAt,
      errors: [],
    };
  }

  /**
   * Get pending releases
   */
  getPendingReleases(): ContentReleaseRequest[] {
    return Array.from(this.pendingReleases.values());
  }

  /**
   * Cancel a pending release
   */
  async cancelRelease(releaseId: string): Promise<void> {
    const request = this.pendingReleases.get(releaseId);
    
    if (!request) {
      throw new Error(`Release ${releaseId} not found`);
    }

    // Remove from pending
    this.pendingReleases.delete(releaseId);

    // Optionally clean up stored translations
    // This depends on whether you want to keep partial translations
  }

  /**
   * Get release status
   */
  async getReleaseStatus(releaseId: string): Promise<{
    exists: boolean;
    validated: boolean;
    completedLanguages: LanguageCode[];
    missingLanguages: LanguageCode[];
  }> {
    const request = this.pendingReleases.get(releaseId);
    
    if (!request) {
      return {
        exists: false,
        validated: false,
        completedLanguages: [],
        missingLanguages: [],
      };
    }

    const requiredLanguages = request.requiredLanguages || 
      SUPPORTED_LANGUAGES.map(lang => lang.code as LanguageCode);

    const completedLanguages: LanguageCode[] = [];
    const missingLanguages: LanguageCode[] = [];

    for (const language of requiredLanguages) {
      const hasTranslations = await this.storage.hasTranslations(
        language,
        request.category
      );

      if (hasTranslations) {
        completedLanguages.push(language);
      } else {
        missingLanguages.push(language);
      }
    }

    const validated = missingLanguages.length === 0;

    return {
      exists: true,
      validated,
      completedLanguages,
      missingLanguages,
    };
  }
}

export default TranslationWorkflowManager;
