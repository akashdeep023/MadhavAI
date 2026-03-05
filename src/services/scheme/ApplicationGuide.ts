/**
 * Application Guide Service
 * Requirements: 2.3, 2.6
 * 
 * Provides step-by-step guidance for scheme applications and deadline tracking
 */

import { Scheme, ApplicationStep } from '../../types/scheme.types';
import { logger } from '../../utils/logger';

export interface DeadlineReminder {
  schemeId: string;
  schemeName: string;
  deadline: Date;
  daysRemaining: number;
  reminderDates: Date[];
}

export interface ApplicationGuidance {
  schemeId: string;
  schemeName: string;
  steps: ApplicationStep[];
  requiredDocuments: string[];
  deadline?: Date;
  applicationUrl?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  estimatedTotalTime?: string;
}

export class ApplicationGuide {
  /**
   * Get complete application guidance for a scheme
   */
  getApplicationGuidance(scheme: Scheme): ApplicationGuidance {
    logger.info(`Getting application guidance for scheme ${scheme.id}`);

    // Calculate estimated total time
    const estimatedTotalTime = this.calculateTotalTime(scheme.applicationSteps);

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      steps: scheme.applicationSteps,
      requiredDocuments: scheme.requiredDocuments,
      deadline: scheme.applicationDeadline,
      applicationUrl: scheme.applicationUrl,
      contactInfo: scheme.contactInfo,
      estimatedTotalTime,
    };
  }

  /**
   * Get step-by-step instructions for application
   */
  getStepByStepInstructions(scheme: Scheme): string {
    const guidance = this.getApplicationGuidance(scheme);
    const parts: string[] = [];

    parts.push(`Application Guide for ${guidance.schemeName}`);
    parts.push('='.repeat(50));
    parts.push('');

    if (guidance.deadline) {
      const daysRemaining = this.calculateDaysRemaining(guidance.deadline);
      parts.push(`⏰ Deadline: ${guidance.deadline.toLocaleDateString()}`);
      parts.push(`   (${daysRemaining} days remaining)`);
      parts.push('');
    }

    if (guidance.estimatedTotalTime) {
      parts.push(`⏱️  Estimated Time: ${guidance.estimatedTotalTime}`);
      parts.push('');
    }

    parts.push('📋 Required Documents:');
    guidance.requiredDocuments.forEach(doc => {
      parts.push(`   • ${doc}`);
    });
    parts.push('');

    parts.push('📝 Application Steps:');
    guidance.steps.forEach(step => {
      parts.push(`\n${step.stepNumber}. ${step.title}`);
      parts.push(`   ${step.description}`);
      
      if (step.requiredDocuments && step.requiredDocuments.length > 0) {
        parts.push(`   Documents needed: ${step.requiredDocuments.join(', ')}`);
      }
      
      if (step.estimatedTime) {
        parts.push(`   Time required: ${step.estimatedTime}`);
      }
    });

    if (guidance.applicationUrl) {
      parts.push('');
      parts.push(`🔗 Apply online: ${guidance.applicationUrl}`);
    }

    if (guidance.contactInfo) {
      parts.push('');
      parts.push('📞 Contact Information:');
      if (guidance.contactInfo.phone) {
        parts.push(`   Phone: ${guidance.contactInfo.phone}`);
      }
      if (guidance.contactInfo.email) {
        parts.push(`   Email: ${guidance.contactInfo.email}`);
      }
      if (guidance.contactInfo.website) {
        parts.push(`   Website: ${guidance.contactInfo.website}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Check if scheme deadline is approaching (within 30 days)
   */
  isDeadlineApproaching(scheme: Scheme): boolean {
    if (!scheme.applicationDeadline) {
      return false;
    }

    const daysRemaining = this.calculateDaysRemaining(scheme.applicationDeadline);
    return daysRemaining > 0 && daysRemaining <= 30;
  }

  /**
   * Get deadline reminder for a scheme
   */
  getDeadlineReminder(scheme: Scheme): DeadlineReminder | null {
    if (!scheme.applicationDeadline) {
      return null;
    }

    const daysRemaining = this.calculateDaysRemaining(scheme.applicationDeadline);
    
    if (daysRemaining <= 0) {
      return null; // Deadline has passed
    }

    const reminderDates = this.calculateReminderDates(scheme.applicationDeadline, daysRemaining);

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      deadline: scheme.applicationDeadline,
      daysRemaining,
      reminderDates,
    };
  }

  /**
   * Get all schemes with approaching deadlines
   */
  getSchemesWithApproachingDeadlines(schemes: Scheme[]): DeadlineReminder[] {
    const reminders: DeadlineReminder[] = [];

    for (const scheme of schemes) {
      if (this.isDeadlineApproaching(scheme)) {
        const reminder = this.getDeadlineReminder(scheme);
        if (reminder) {
          reminders.push(reminder);
        }
      }
    }

    // Sort by days remaining (most urgent first)
    reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return reminders;
  }

  /**
   * Schedule reminders for scheme deadlines
   * Returns dates when reminders should be sent
   */
  scheduleReminders(scheme: Scheme): Date[] {
    const reminder = this.getDeadlineReminder(scheme);
    
    if (!reminder) {
      return [];
    }

    return reminder.reminderDates;
  }

  /**
   * Calculate days remaining until deadline
   */
  private calculateDaysRemaining(deadline: Date): number {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Calculate reminder dates based on deadline
   * Reminders at: 30 days, 14 days, 7 days, 3 days, 1 day before deadline
   */
  private calculateReminderDates(deadline: Date, daysRemaining: number): Date[] {
    const reminderDays = [30, 14, 7, 3, 1];
    const reminderDates: Date[] = [];
    const now = new Date();

    for (const days of reminderDays) {
      if (daysRemaining >= days) {
        const reminderDate = new Date(deadline);
        reminderDate.setDate(reminderDate.getDate() - days);
        
        // Only include future reminders
        if (reminderDate > now) {
          reminderDates.push(reminderDate);
        }
      }
    }

    return reminderDates;
  }

  /**
   * Calculate total estimated time for all application steps
   */
  private calculateTotalTime(steps: ApplicationStep[]): string {
    const times = steps
      .map(step => step.estimatedTime)
      .filter((time): time is string => time !== undefined);

    if (times.length === 0) {
      return 'Not specified';
    }

    // Simple aggregation - just list all times
    // In a real implementation, you might parse and sum the times
    return times.join(' + ');
  }

  /**
   * Get required documents checklist
   */
  getDocumentChecklist(scheme: Scheme): { document: string; checked: boolean }[] {
    return scheme.requiredDocuments.map(doc => ({
      document: doc,
      checked: false,
    }));
  }

  /**
   * Validate if all required documents are available
   */
  validateDocuments(scheme: Scheme, availableDocuments: string[]): {
    isComplete: boolean;
    missingDocuments: string[];
  } {
    const missingDocuments = scheme.requiredDocuments.filter(
      doc => !availableDocuments.includes(doc)
    );

    return {
      isComplete: missingDocuments.length === 0,
      missingDocuments,
    };
  }
}

export const applicationGuide = new ApplicationGuide();
