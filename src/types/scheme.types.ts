/**
 * Government Scheme related type definitions
 */

export interface Scheme {
  id: string;
  name: string;
  description: string;
  category: SchemeCategory;
  eligibilityCriteria: EligibilityCriteria;
  benefits: string[];
  applicationDeadline?: Date;
  applicationUrl?: string;
  requiredDocuments: string[];
  applicationSteps: ApplicationStep[];
  contactInfo?: ContactInfo;
  state?: string;
  district?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SchemeCategory =
  | 'subsidy'
  | 'loan'
  | 'insurance'
  | 'training'
  | 'equipment'
  | 'irrigation'
  | 'organic_farming'
  | 'crop_insurance'
  | 'other';

export interface EligibilityCriteria {
  minFarmSize?: number; // in acres
  maxFarmSize?: number; // in acres
  minIncome?: number; // annual income in INR
  maxIncome?: number; // annual income in INR
  allowedCrops?: string[];
  allowedStates?: string[];
  allowedDistricts?: string[];
  farmerCategory?: FarmerCategory[];
  landOwnership?: LandOwnership[];
  otherCriteria?: string[];
}

export type FarmerCategory =
  | 'small'
  | 'marginal'
  | 'medium'
  | 'large'
  | 'landless'
  | 'tenant'
  | 'sharecropper';

export type LandOwnership = 'owned' | 'leased' | 'sharecropped' | 'any';

export interface ApplicationStep {
  stepNumber: number;
  title: string;
  description: string;
  requiredDocuments?: string[];
  estimatedTime?: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  officeAddress?: string;
}

export interface EligibilityResult {
  schemeId: string;
  isEligible: boolean;
  reasons: string[];
  missingCriteria?: string[];
  alternativeSchemes?: string[];
  confidence: number; // 0-100
}
