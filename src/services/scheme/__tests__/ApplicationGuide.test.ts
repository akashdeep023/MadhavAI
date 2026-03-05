/**
 * Application Guide Tests
 */

import { ApplicationGuide } from '../ApplicationGuide';
import { Scheme } from '../../../types/scheme.types';

describe('ApplicationGuide', () => {
  let guide: ApplicationGuide;

  const mockScheme: Scheme = {
    id: 'scheme-001',
    name: 'PM-KISAN',
    description: 'Direct income support',
    category: 'subsidy',
    eligibilityCriteria: {
      maxFarmSize: 5,
    },
    benefits: ['Rs 6000 per year'],
    requiredDocuments: ['Aadhaar Card', 'Land Records', 'Bank Account Details'],
    applicationSteps: [
      {
        stepNumber: 1,
        title: 'Register online',
        description: 'Visit the PM-KISAN portal and register',
        requiredDocuments: ['Aadhaar Card'],
        estimatedTime: '10 minutes',
      },
      {
        stepNumber: 2,
        title: 'Upload documents',
        description: 'Upload required documents',
        requiredDocuments: ['Land Records', 'Bank Account Details'],
        estimatedTime: '15 minutes',
      },
      {
        stepNumber: 3,
        title: 'Submit application',
        description: 'Review and submit your application',
        estimatedTime: '5 minutes',
      },
    ],
    applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    applicationUrl: 'https://pmkisan.gov.in',
    contactInfo: {
      phone: '1800-123-4567',
      email: 'support@pmkisan.gov.in',
      website: 'https://pmkisan.gov.in',
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    guide = new ApplicationGuide();
  });

  describe('getApplicationGuidance', () => {
    it('should return complete application guidance', () => {
      const guidance = guide.getApplicationGuidance(mockScheme);

      expect(guidance.schemeId).toBe('scheme-001');
      expect(guidance.schemeName).toBe('PM-KISAN');
      expect(guidance.steps).toHaveLength(3);
      expect(guidance.requiredDocuments).toHaveLength(3);
      expect(guidance.deadline).toBeDefined();
      expect(guidance.applicationUrl).toBe('https://pmkisan.gov.in');
      expect(guidance.contactInfo).toBeDefined();
    });

    it('should include all application steps', () => {
      const guidance = guide.getApplicationGuidance(mockScheme);

      expect(guidance.steps[0].title).toBe('Register online');
      expect(guidance.steps[1].title).toBe('Upload documents');
      expect(guidance.steps[2].title).toBe('Submit application');
    });

    it('should calculate estimated total time', () => {
      const guidance = guide.getApplicationGuidance(mockScheme);

      expect(guidance.estimatedTotalTime).toBeDefined();
      expect(guidance.estimatedTotalTime).toContain('minutes');
    });

    it('should handle scheme without deadline', () => {
      const schemeWithoutDeadline = { ...mockScheme, applicationDeadline: undefined };
      const guidance = guide.getApplicationGuidance(schemeWithoutDeadline);

      expect(guidance.deadline).toBeUndefined();
    });
  });

  describe('getStepByStepInstructions', () => {
    it('should generate formatted instructions', () => {
      const instructions = guide.getStepByStepInstructions(mockScheme);

      expect(instructions).toContain('PM-KISAN');
      expect(instructions).toContain('Required Documents');
      expect(instructions).toContain('Application Steps');
      expect(instructions).toContain('Register online');
      expect(instructions).toContain('Upload documents');
      expect(instructions).toContain('Submit application');
    });

    it('should include deadline information', () => {
      const instructions = guide.getStepByStepInstructions(mockScheme);

      expect(instructions).toContain('Deadline');
      expect(instructions).toContain('days remaining');
    });

    it('should include application URL', () => {
      const instructions = guide.getStepByStepInstructions(mockScheme);

      expect(instructions).toContain('https://pmkisan.gov.in');
    });

    it('should include contact information', () => {
      const instructions = guide.getStepByStepInstructions(mockScheme);

      expect(instructions).toContain('Contact Information');
      expect(instructions).toContain('1800-123-4567');
      expect(instructions).toContain('support@pmkisan.gov.in');
    });

    it('should include estimated time for each step', () => {
      const instructions = guide.getStepByStepInstructions(mockScheme);

      expect(instructions).toContain('10 minutes');
      expect(instructions).toContain('15 minutes');
      expect(instructions).toContain('5 minutes');
    });
  });

  describe('isDeadlineApproaching', () => {
    it('should return true for deadline within 30 days', () => {
      const result = guide.isDeadlineApproaching(mockScheme);

      expect(result).toBe(true);
    });

    it('should return false for deadline beyond 30 days', () => {
      const futureScheme = {
        ...mockScheme,
        applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      };

      const result = guide.isDeadlineApproaching(futureScheme);

      expect(result).toBe(false);
    });

    it('should return false for past deadline', () => {
      const pastScheme = {
        ...mockScheme,
        applicationDeadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };

      const result = guide.isDeadlineApproaching(pastScheme);

      expect(result).toBe(false);
    });

    it('should return false for scheme without deadline', () => {
      const noDeadlineScheme = { ...mockScheme, applicationDeadline: undefined };

      const result = guide.isDeadlineApproaching(noDeadlineScheme);

      expect(result).toBe(false);
    });
  });

  describe('getDeadlineReminder', () => {
    it('should return reminder for scheme with approaching deadline', () => {
      const reminder = guide.getDeadlineReminder(mockScheme);

      expect(reminder).not.toBeNull();
      expect(reminder!.schemeId).toBe('scheme-001');
      expect(reminder!.schemeName).toBe('PM-KISAN');
      expect(reminder!.daysRemaining).toBeGreaterThan(0);
      expect(reminder!.reminderDates).toBeDefined();
    });

    it('should return null for scheme without deadline', () => {
      const noDeadlineScheme = { ...mockScheme, applicationDeadline: undefined };
      const reminder = guide.getDeadlineReminder(noDeadlineScheme);

      expect(reminder).toBeNull();
    });

    it('should return null for past deadline', () => {
      const pastScheme = {
        ...mockScheme,
        applicationDeadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      };
      const reminder = guide.getDeadlineReminder(pastScheme);

      expect(reminder).toBeNull();
    });

    it('should include reminder dates', () => {
      const reminder = guide.getDeadlineReminder(mockScheme);

      expect(reminder).not.toBeNull();
      expect(reminder!.reminderDates.length).toBeGreaterThan(0);
    });
  });

  describe('getSchemesWithApproachingDeadlines', () => {
    it('should return schemes with deadlines within 30 days', () => {
      const schemes: Scheme[] = [
        mockScheme,
        {
          ...mockScheme,
          id: 'scheme-002',
          name: 'Scheme 2',
          applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        },
        {
          ...mockScheme,
          id: 'scheme-003',
          name: 'Scheme 3',
          applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // Beyond 30 days
        },
      ];

      const reminders = guide.getSchemesWithApproachingDeadlines(schemes);

      expect(reminders).toHaveLength(2);
      expect(reminders.some(r => r.schemeId === 'scheme-001')).toBe(true);
      expect(reminders.some(r => r.schemeId === 'scheme-002')).toBe(true);
      expect(reminders.some(r => r.schemeId === 'scheme-003')).toBe(false);
    });

    it('should sort reminders by urgency (days remaining)', () => {
      const schemes: Scheme[] = [
        {
          ...mockScheme,
          id: 'scheme-001',
          applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        },
        {
          ...mockScheme,
          id: 'scheme-002',
          applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          ...mockScheme,
          id: 'scheme-003',
          applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      ];

      const reminders = guide.getSchemesWithApproachingDeadlines(schemes);

      expect(reminders[0].schemeId).toBe('scheme-002'); // Most urgent (5 days)
      expect(reminders[1].schemeId).toBe('scheme-003'); // 15 days
      expect(reminders[2].schemeId).toBe('scheme-001'); // 20 days
    });

    it('should return empty array if no approaching deadlines', () => {
      const schemes: Scheme[] = [
        {
          ...mockScheme,
          applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
      ];

      const reminders = guide.getSchemesWithApproachingDeadlines(schemes);

      expect(reminders).toHaveLength(0);
    });
  });

  describe('scheduleReminders', () => {
    it('should return reminder dates for scheme with deadline', () => {
      const reminderDates = guide.scheduleReminders(mockScheme);

      expect(reminderDates.length).toBeGreaterThan(0);
      expect(reminderDates.every(date => date instanceof Date)).toBe(true);
    });

    it('should return empty array for scheme without deadline', () => {
      const noDeadlineScheme = { ...mockScheme, applicationDeadline: undefined };
      const reminderDates = guide.scheduleReminders(noDeadlineScheme);

      expect(reminderDates).toHaveLength(0);
    });

    it('should only include future reminder dates', () => {
      const now = new Date();
      const reminderDates = guide.scheduleReminders(mockScheme);

      expect(reminderDates.every(date => date > now)).toBe(true);
    });
  });

  describe('getDocumentChecklist', () => {
    it('should return checklist of required documents', () => {
      const checklist = guide.getDocumentChecklist(mockScheme);

      expect(checklist).toHaveLength(3);
      expect(checklist[0].document).toBe('Aadhaar Card');
      expect(checklist[0].checked).toBe(false);
      expect(checklist[1].document).toBe('Land Records');
      expect(checklist[2].document).toBe('Bank Account Details');
    });

    it('should initialize all documents as unchecked', () => {
      const checklist = guide.getDocumentChecklist(mockScheme);

      expect(checklist.every(item => item.checked === false)).toBe(true);
    });
  });

  describe('validateDocuments', () => {
    it('should return complete when all documents are available', () => {
      const availableDocuments = ['Aadhaar Card', 'Land Records', 'Bank Account Details'];
      const result = guide.validateDocuments(mockScheme, availableDocuments);

      expect(result.isComplete).toBe(true);
      expect(result.missingDocuments).toHaveLength(0);
    });

    it('should identify missing documents', () => {
      const availableDocuments = ['Aadhaar Card'];
      const result = guide.validateDocuments(mockScheme, availableDocuments);

      expect(result.isComplete).toBe(false);
      expect(result.missingDocuments).toHaveLength(2);
      expect(result.missingDocuments).toContain('Land Records');
      expect(result.missingDocuments).toContain('Bank Account Details');
    });

    it('should return incomplete when no documents are available', () => {
      const availableDocuments: string[] = [];
      const result = guide.validateDocuments(mockScheme, availableDocuments);

      expect(result.isComplete).toBe(false);
      expect(result.missingDocuments).toHaveLength(3);
    });
  });
});
