/**
 * Soil Health Types
 * Requirements: 10.1, 10.2, 10.7, 10.8
 */

export interface SoilHealthData {
  id: string;
  userId: string;
  farmId?: string;
  testDate: Date;
  labName: string;
  sampleId: string;
  location: {
    latitude: number;
    longitude: number;
    fieldName?: string;
  };
  parameters: {
    // Macronutrients
    nitrogen: number; // kg/ha
    phosphorus: number; // kg/ha
    potassium: number; // kg/ha
    // Secondary nutrients
    sulfur?: number; // ppm
    calcium?: number; // ppm
    magnesium?: number; // ppm
    // Micronutrients
    iron?: number; // ppm
    zinc?: number; // ppm
    copper?: number; // ppm
    manganese?: number; // ppm
    boron?: number; // ppm
    // Soil properties
    pH: number;
    electricalConductivity: number; // dS/m
    organicCarbon: number; // %
    organicMatter?: number; // %
  };
  soilType: 'clay' | 'sandy' | 'loamy' | 'silt' | 'peaty' | 'chalky' | 'mixed';
  texture?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoilAnalysis {
  soilHealthId: string;
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  score: number; // 0-100
  interpretation: {
    summary: string;
    details: string[];
  };
  nutrientStatus: {
    nutrient: string;
    value: number;
    unit: string;
    status: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
    interpretation: string;
  }[];
  deficiencies: string[];
  excesses: string[];
  recommendations: string[];
  testAge: {
    days: number;
    needsRetesting: boolean;
    message?: string;
  };
  suitableCrops: {
    crop: string;
    suitabilityScore: number; // 0-100
    reason: string;
  }[];
}

export interface SoilImprovement {
  soilHealthId: string;
  deficiency: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: {
    type: 'organic' | 'chemical' | 'practice';
    title: string;
    description: string;
    materials?: string[];
    application: {
      rate?: string;
      timing?: string;
      method?: string;
    };
    expectedImprovement: string;
    cost?: {
      min: number;
      max: number;
      currency: string;
    };
  }[];
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export interface NutrientRange {
  nutrient: string;
  unit: string;
  ranges: {
    deficient: { max: number };
    low: { min: number; max: number };
    adequate: { min: number; max: number };
    high: { min: number; max: number };
    excessive: { min: number };
  };
}

export interface CropSuitability {
  crop: string;
  requirements: {
    pH: { min: number; max: number };
    nitrogen: { min: number; max: number };
    phosphorus: { min: number; max: number };
    potassium: { min: number; max: number };
    organicCarbon: { min: number };
  };
  preferredSoilTypes: string[];
}
