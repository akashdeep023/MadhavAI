/**
 * PriorityEngine Service
 * Prioritizes information display on dashboard
 * Requirements: 14.8
 */

import {Alert} from '../../types/alert.types';
import {Insight} from '../../types/dashboard.types';

/**
 * Priority weights for different factors
 */
const PRIORITY_WEIGHTS = {
  TIME_SENSITIVITY: 0.4,
  IMPORTANCE: 0.3,
  ACTIONABILITY: 0.2,
  RECENCY: 0.1,
};

/**
 * Priority levels mapping to scores
 */
const PRIORITY_SCORES = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

/**
 * Engine for prioritizing dashboard information
 */
export class PriorityEngine {
  /**
   * Prioritize alerts by time sensitivity and importance
   * Requirement: 14.8
   */
  prioritizeAlerts(alerts: Alert[]): Alert[] {
    const scoredAlerts = alerts.map(alert => ({
      item: alert,
      score: this.calculateAlertPriority(alert),
      reason: this.getAlertPriorityReason(alert),
    }));

    // Sort by score descending
    scoredAlerts.sort((a, b) => b.score - a.score);

    return scoredAlerts.map(scored => scored.item);
  }

  /**
   * Prioritize insights by relevance and actionability
   * Requirement: 14.8
   */
  prioritizeInsights(insights: Insight[]): Insight[] {
    const scoredInsights = insights.map(insight => ({
      item: insight,
      score: this.calculateInsightPriority(insight),
      reason: this.getInsightPriorityReason(insight),
    }));

    // Sort by score descending
    scoredInsights.sort((a, b) => b.score - a.score);

    return scoredInsights.map(scored => scored.item);
  }

  /**
   * Determine if information is time-sensitive
   * Requirement: 14.8
   */
  isTimeSensitive(item: Alert | Insight): boolean {
    if ('scheduledTime' in item) {
      // Alert
      const alert = item as Alert;
      const now = new Date();
      const scheduledTime = new Date(alert.scheduledTime);
      const hoursUntil =
        (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Time-sensitive if within 24 hours
      return hoursUntil <= 24 && hoursUntil >= 0;
    } else {
      // Insight
      const insight = item as Insight;
      return (
        insight.priority === 'high' &&
        (insight.type === 'alert' ||
          insight.type === 'harvest' ||
          insight.type === 'weather')
      );
    }
  }

  /**
   * Calculate priority score for an alert
   */
  private calculateAlertPriority(alert: Alert): number {
    let score = 0;

    // Time sensitivity score
    const timeSensitivityScore = this.getTimeSensitivityScore(alert);
    score += timeSensitivityScore * PRIORITY_WEIGHTS.TIME_SENSITIVITY;

    // Importance score based on priority
    const importanceScore = PRIORITY_SCORES[alert.priority] || 25;
    score += importanceScore * PRIORITY_WEIGHTS.IMPORTANCE;

    // Actionability score
    const actionabilityScore = alert.actionable ? 100 : 50;
    score += actionabilityScore * PRIORITY_WEIGHTS.ACTIONABILITY;

    // Recency score (newer alerts get higher score)
    const recencyScore = this.getRecencyScore(new Date(alert.scheduledTime));
    score += recencyScore * PRIORITY_WEIGHTS.RECENCY;

    return score;
  }

  /**
   * Calculate priority score for an insight
   */
  private calculateInsightPriority(insight: Insight): number {
    let score = 0;

    // Time sensitivity score based on type
    const timeSensitivityScore = this.getInsightTimeSensitivityScore(insight);
    score += timeSensitivityScore * PRIORITY_WEIGHTS.TIME_SENSITIVITY;

    // Importance score based on priority
    const importanceScore = PRIORITY_SCORES[insight.priority] || 25;
    score += importanceScore * PRIORITY_WEIGHTS.IMPORTANCE;

    // Actionability score
    const actionabilityScore = insight.actionable ? 100 : 50;
    score += actionabilityScore * PRIORITY_WEIGHTS.ACTIONABILITY;

    // Type-based score
    const typeScore = this.getInsightTypeScore(insight.type);
    score += typeScore * PRIORITY_WEIGHTS.RECENCY;

    return score;
  }

  /**
   * Get time sensitivity score for alert
   */
  private getTimeSensitivityScore(alert: Alert): number {
    const now = new Date();
    const scheduledTime = new Date(alert.scheduledTime);
    const hoursUntil =
      (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) {
      // Past due
      return 100;
    } else if (hoursUntil <= 2) {
      // Within 2 hours
      return 90;
    } else if (hoursUntil <= 6) {
      // Within 6 hours
      return 80;
    } else if (hoursUntil <= 24) {
      // Within 24 hours
      return 70;
    } else if (hoursUntil <= 48) {
      // Within 48 hours
      return 50;
    } else {
      // More than 48 hours
      return 30;
    }
  }

  /**
   * Get time sensitivity score for insight
   */
  private getInsightTimeSensitivityScore(insight: Insight): number {
    // Time-sensitive insight types
    const timeSensitiveTypes = ['alert', 'harvest', 'weather', 'price'];

    if (timeSensitiveTypes.includes(insight.type)) {
      return 100;
    } else if (insight.type === 'seasonal') {
      return 70;
    } else {
      return 50;
    }
  }

  /**
   * Get recency score (newer items get higher score)
   */
  private getRecencyScore(date: Date): number {
    const now = new Date();
    const hoursSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (hoursSince <= 1) {
      return 100;
    } else if (hoursSince <= 6) {
      return 80;
    } else if (hoursSince <= 24) {
      return 60;
    } else if (hoursSince <= 48) {
      return 40;
    } else {
      return 20;
    }
  }

  /**
   * Get type-based score for insight
   */
  private getInsightTypeScore(type: string): number {
    const typeScores: {[key: string]: number} = {
      alert: 100,
      harvest: 90,
      weather: 85,
      price: 80,
      seasonal: 70,
      scheme: 60,
      training: 50,
      general: 40,
    };

    return typeScores[type] || 40;
  }

  /**
   * Get priority reason for alert
   */
  private getAlertPriorityReason(alert: Alert): string {
    const reasons: string[] = [];

    if (this.isTimeSensitive(alert)) {
      reasons.push('Time-sensitive');
    }

    if (alert.priority === 'critical' || alert.priority === 'high') {
      reasons.push('High importance');
    }

    if (alert.actionable) {
      reasons.push('Requires action');
    }

    return reasons.join(', ') || 'Standard priority';
  }

  /**
   * Get priority reason for insight
   */
  private getInsightPriorityReason(insight: Insight): string {
    const reasons: string[] = [];

    if (this.isTimeSensitive(insight)) {
      reasons.push('Time-sensitive');
    }

    if (insight.priority === 'high') {
      reasons.push('High importance');
    }

    if (insight.actionable) {
      reasons.push('Actionable');
    }

    return reasons.join(', ') || 'Standard priority';
  }

  /**
   * Filter items to show only time-sensitive ones first
   * Requirement: 14.8
   */
  filterTimeSensitive<T extends Alert | Insight>(items: T[]): {
    timeSensitive: T[];
    others: T[];
  } {
    const timeSensitive: T[] = [];
    const others: T[] = [];

    for (const item of items) {
      if (this.isTimeSensitive(item)) {
        timeSensitive.push(item);
      } else {
        others.push(item);
      }
    }

    return {timeSensitive, others};
  }
}

export default PriorityEngine;
