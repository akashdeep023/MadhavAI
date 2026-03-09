/**
 * Feedback Collector Service
 * Captures user feedback on recommendations
 * Requirements: 16.6
 */

export type FeedbackAction = 'accepted' | 'rejected' | 'modified';
export type RecommendationType = 'crop' | 'fertilizer' | 'seed';

/**
 * Feedback data for storage
 */
export interface FeedbackData {
  id: string;
  userId: string;
  recommendationType: RecommendationType;
  recommendationId: string;
  recommendationData: any; // Original recommendation
  action: FeedbackAction;
  modifications?: Record<string, any>;
  reason?: string;
  timestamp: Date;
  contextSnapshot: {
    season: string;
    soilType?: string;
    location: string;
  };
}

/**
 * Feedback collector for capturing user responses to recommendations
 */
export class FeedbackCollector {
  private feedbackStore: FeedbackData[] = [];

  /**
   * Collect feedback when user accepts a recommendation
   */
  async collectAcceptedFeedback(
    userId: string,
    recommendationType: RecommendationType,
    recommendationId: string,
    recommendationData: any,
    contextSnapshot: FeedbackData['contextSnapshot']
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateFeedbackId(),
      userId,
      recommendationType,
      recommendationId,
      recommendationData,
      action: 'accepted',
      timestamp: new Date(),
      contextSnapshot,
    };

    this.feedbackStore.push(feedback);
    return feedback;
  }

  /**
   * Collect feedback when user rejects a recommendation
   */
  async collectRejectedFeedback(
    userId: string,
    recommendationType: RecommendationType,
    recommendationId: string,
    recommendationData: any,
    reason: string,
    contextSnapshot: FeedbackData['contextSnapshot']
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateFeedbackId(),
      userId,
      recommendationType,
      recommendationId,
      recommendationData,
      action: 'rejected',
      reason,
      timestamp: new Date(),
      contextSnapshot,
    };

    this.feedbackStore.push(feedback);
    return feedback;
  }

  /**
   * Collect feedback when user modifies a recommendation
   */
  async collectModifiedFeedback(
    userId: string,
    recommendationType: RecommendationType,
    recommendationId: string,
    recommendationData: any,
    modifications: Record<string, any>,
    contextSnapshot: FeedbackData['contextSnapshot']
  ): Promise<FeedbackData> {
    const feedback: FeedbackData = {
      id: this.generateFeedbackId(),
      userId,
      recommendationType,
      recommendationId,
      recommendationData,
      action: 'modified',
      modifications,
      timestamp: new Date(),
      contextSnapshot,
    };

    this.feedbackStore.push(feedback);
    return feedback;
  }

  /**
   * Get all feedback for a user
   */
  async getFeedbackByUser(userId: string): Promise<FeedbackData[]> {
    return this.feedbackStore.filter((f) => f.userId === userId);
  }

  /**
   * Get feedback by recommendation type
   */
  async getFeedbackByType(type: RecommendationType): Promise<FeedbackData[]> {
    return this.feedbackStore.filter((f) => f.recommendationType === type);
  }

  /**
   * Get feedback within a date range
   */
  async getFeedbackByDateRange(startDate: Date, endDate: Date): Promise<FeedbackData[]> {
    return this.feedbackStore.filter(
      (f) => f.timestamp >= startDate && f.timestamp <= endDate
    );
  }

  /**
   * Get all feedback
   */
  async getAllFeedback(): Promise<FeedbackData[]> {
    return [...this.feedbackStore];
  }

  /**
   * Clear all feedback (for testing)
   */
  async clearFeedback(): Promise<void> {
    this.feedbackStore = [];
  }

  /**
   * Generate unique feedback ID
   */
  private generateFeedbackId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    total: number;
    accepted: number;
    rejected: number;
    modified: number;
    acceptanceRate: number;
  }> {
    const total = this.feedbackStore.length;
    const accepted = this.feedbackStore.filter((f) => f.action === 'accepted').length;
    const rejected = this.feedbackStore.filter((f) => f.action === 'rejected').length;
    const modified = this.feedbackStore.filter((f) => f.action === 'modified').length;
    const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;

    return {
      total,
      accepted,
      rejected,
      modified,
      acceptanceRate,
    };
  }
}

// Export singleton instance
export const feedbackCollector = new FeedbackCollector();
