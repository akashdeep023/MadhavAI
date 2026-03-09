/**
 * TrainingService
 * Main service for training module with API integration
 */

import {
  Lesson,
  LessonDetail,
  LearningProgress,
  LessonCategory,
} from '../../types/training.types';
import { ContentManager } from './ContentManager';
import { ProgressTracker } from './ProgressTracker';
import { apiClient } from '../api/apiClient';

export class TrainingService {
  private contentManager: ContentManager;
  private progressTracker: ProgressTracker;

  constructor(
    contentManager: ContentManager,
    progressTracker: ProgressTracker
  ) {
    this.contentManager = contentManager;
    this.progressTracker = progressTracker;
  }

  /**
   * Get lessons for a category with offline fallback
   */
  async getLessons(
    category: string,
    language: string
  ): Promise<Lesson[]> {
    try {
      // Try to fetch from API first
      const response = await apiClient.get('/training/lessons', {
        params: { category, language },
      });
      
      // Store lessons locally for offline access
      if (response.data?.lessons) {
        for (const lesson of response.data.lessons) {
          await this.contentManager.storeLesson(lesson);
        }
      }
      
      return response.data.lessons || [];
    } catch {
      // Fallback to local storage if offline
      return this.contentManager.getLessons(category as LessonCategory, language);
    }
  }

  /**
   * Get detailed lesson information
   */
  async getLesson(
    lessonId: string,
    language: string
  ): Promise<LessonDetail | null> {
    try {
      // Try to fetch from API first
      const response = await apiClient.get(`/training/lessons/${lessonId}`, {
        params: { language },
      });
      
      if (response.data?.lesson) {
        await this.contentManager.storeLesson(response.data.lesson);
        return response.data.lesson;
      }
      
      return null;
    } catch {
      // Fallback to local storage if offline
      return this.contentManager.getLesson(lessonId, language);
    }
  }

  /**
   * Mark lesson as complete and get suggestions
   */
  async markLessonComplete(
    userId: string,
    lessonId: string
  ): Promise<{ relatedLessons: Lesson[] }> {
    await this.progressTracker.markLessonComplete(userId, lessonId);
    
    // Get user's language preference (default to Hindi)
    const language = 'hi'; // Should come from user profile
    
    // Get related lessons
    const relatedLessons = await this.contentManager.getRelatedLessons(
      lessonId,
      language
    );
    
    return { relatedLessons };
  }

  /**
   * Get user's learning progress
   */
  async getUserProgress(userId: string): Promise<LearningProgress> {
    return this.progressTracker.getUserProgress(userId);
  }

  /**
   * Search lessons by keyword
   */
  async searchLessons(
    keyword: string,
    language: string
  ): Promise<Lesson[]> {
    return this.contentManager.searchLessons(keyword, language);
  }

  /**
   * Check if lesson is available offline
   */
  async isAvailableOffline(lessonId: string): Promise<boolean> {
    return this.contentManager.isAvailableOffline(lessonId);
  }
}
