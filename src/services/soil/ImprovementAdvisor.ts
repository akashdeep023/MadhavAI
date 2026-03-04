/**
 * Improvement Advisor
 * Provides soil improvement recommendations
 * Requirements: 10.4, 10.5
 */

import { logger } from '../../utils/logger';
import { SoilHealthData, SoilImprovement } from '../../types/soil.types';

class ImprovementAdvisor {
  /**
   * Generate improvement recommendations for soil deficiencies
   */
  generateRecommendations(soilData: SoilHealthData): SoilImprovement[] {
    logger.info(`Generating improvement recommendations for soil ${soilData.sampleId}`);

    const improvements: SoilImprovement[] = [];

    // Check nitrogen
    if (soilData.parameters.nitrogen < 250) {
      improvements.push(this.getNitrogenImprovement(soilData));
    }

    // Check phosphorus
    if (soilData.parameters.phosphorus < 20) {
      improvements.push(this.getPhosphorusImprovement(soilData));
    }

    // Check potassium
    if (soilData.parameters.potassium < 200) {
      improvements.push(this.getPotassiumImprovement(soilData));
    }

    // Check pH
    if (soilData.parameters.pH < 6.0 || soilData.parameters.pH > 7.5) {
      improvements.push(this.getpHImprovement(soilData));
    }

    // Check organic carbon
    if (soilData.parameters.organicCarbon < 0.5) {
      improvements.push(this.getOrganicMatterImprovement(soilData));
    }

    // Sort by priority
    improvements.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    logger.info(`Generated ${improvements.length} improvement recommendations`);

    return improvements;
  }

  /**
   * Get nitrogen improvement recommendations
   */
  private getNitrogenImprovement(soilData: SoilHealthData): SoilImprovement {
    const deficit = 250 - soilData.parameters.nitrogen;
    const severity = this.getSeverity(deficit, 250);

    return {
      soilHealthId: soilData.id,
      deficiency: 'Nitrogen',
      severity,
      recommendations: [
        {
          type: 'organic',
          title: 'Apply Farmyard Manure (FYM)',
          description: 'Well-decomposed farmyard manure is rich in nitrogen and improves soil structure',
          materials: ['Farmyard manure', 'Cow dung compost'],
          application: {
            rate: '10-15 tons per hectare',
            timing: '2-3 weeks before sowing',
            method: 'Spread evenly and incorporate into soil',
          },
          expectedImprovement: 'Increases nitrogen by 40-60 kg/ha over 3-4 months',
          cost: {
            min: 5000,
            max: 10000,
            currency: 'INR',
          },
        },
        {
          type: 'chemical',
          title: 'Apply Urea Fertilizer',
          description: 'Quick-acting nitrogen source for immediate deficiency correction',
          materials: ['Urea (46% N)'],
          application: {
            rate: `${Math.ceil(deficit / 0.46)} kg per hectare`,
            timing: 'Split application - at sowing and top dressing',
            method: 'Apply in bands or broadcast and incorporate',
          },
          expectedImprovement: `Increases nitrogen by ${deficit} kg/ha within 2-3 weeks`,
          cost: {
            min: 2000,
            max: 5000,
            currency: 'INR',
          },
        },
        {
          type: 'practice',
          title: 'Grow Green Manure Crops',
          description: 'Leguminous crops fix atmospheric nitrogen and add organic matter',
          materials: ['Dhaincha seeds', 'Sunhemp seeds', 'Cowpea seeds'],
          application: {
            rate: '20-25 kg seeds per hectare',
            timing: 'Grow for 45-60 days before main crop',
            method: 'Sow, allow to grow, then incorporate into soil',
          },
          expectedImprovement: 'Adds 40-80 kg nitrogen per hectare',
          cost: {
            min: 1500,
            max: 3000,
            currency: 'INR',
          },
        },
      ],
      timeline: severity === 'high' ? '2-4 weeks' : '1-3 months',
      priority: severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'low',
    };
  }

  /**
   * Get phosphorus improvement recommendations
   */
  private getPhosphorusImprovement(soilData: SoilHealthData): SoilImprovement {
    const deficit = 20 - soilData.parameters.phosphorus;
    const severity = this.getSeverity(deficit, 20);

    return {
      soilHealthId: soilData.id,
      deficiency: 'Phosphorus',
      severity,
      recommendations: [
        {
          type: 'organic',
          title: 'Apply Bone Meal',
          description: 'Natural source of phosphorus that releases slowly',
          materials: ['Bone meal', 'Rock phosphate'],
          application: {
            rate: '200-300 kg per hectare',
            timing: 'At the time of land preparation',
            method: 'Mix thoroughly with soil',
          },
          expectedImprovement: 'Increases phosphorus by 10-15 kg/ha over 3-6 months',
          cost: {
            min: 3000,
            max: 6000,
            currency: 'INR',
          },
        },
        {
          type: 'chemical',
          title: 'Apply Single Super Phosphate (SSP)',
          description: 'Readily available phosphorus source',
          materials: ['Single Super Phosphate (16% P2O5)'],
          application: {
            rate: `${Math.ceil((deficit * 2.29) / 0.16)} kg per hectare`,
            timing: 'Basal application at sowing',
            method: 'Apply in furrows or bands near seed',
          },
          expectedImprovement: `Increases phosphorus by ${deficit} kg/ha within 3-4 weeks`,
          cost: {
            min: 2500,
            max: 5000,
            currency: 'INR',
          },
        },
        {
          type: 'practice',
          title: 'Apply Compost',
          description: 'Well-decomposed compost provides phosphorus and improves soil health',
          materials: ['Compost', 'Vermicompost'],
          application: {
            rate: '5-7 tons per hectare',
            timing: '2-3 weeks before sowing',
            method: 'Spread evenly and incorporate',
          },
          expectedImprovement: 'Adds 8-12 kg phosphorus per hectare',
          cost: {
            min: 4000,
            max: 8000,
            currency: 'INR',
          },
        },
      ],
      timeline: severity === 'high' ? '3-4 weeks' : '2-3 months',
      priority: severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'low',
    };
  }

  /**
   * Get potassium improvement recommendations
   */
  private getPotassiumImprovement(soilData: SoilHealthData): SoilImprovement {
    const deficit = 200 - soilData.parameters.potassium;
    const severity = this.getSeverity(deficit, 200);

    return {
      soilHealthId: soilData.id,
      deficiency: 'Potassium',
      severity,
      recommendations: [
        {
          type: 'organic',
          title: 'Apply Wood Ash',
          description: 'Natural source of potassium from burnt plant material',
          materials: ['Wood ash', 'Crop residue ash'],
          application: {
            rate: '500-1000 kg per hectare',
            timing: 'During land preparation',
            method: 'Spread evenly and mix with soil',
          },
          expectedImprovement: 'Adds 20-40 kg potassium per hectare',
          cost: {
            min: 1000,
            max: 2000,
            currency: 'INR',
          },
        },
        {
          type: 'chemical',
          title: 'Apply Muriate of Potash (MOP)',
          description: 'Concentrated potassium source for quick correction',
          materials: ['Muriate of Potash (60% K2O)'],
          application: {
            rate: `${Math.ceil((deficit * 1.2) / 0.6)} kg per hectare`,
            timing: 'Split application - basal and top dressing',
            method: 'Apply in bands or broadcast',
          },
          expectedImprovement: `Increases potassium by ${deficit} kg/ha within 2-3 weeks`,
          cost: {
            min: 3000,
            max: 6000,
            currency: 'INR',
          },
        },
        {
          type: 'practice',
          title: 'Mulch with Crop Residues',
          description: 'Decomposing crop residues release potassium',
          materials: ['Crop residues', 'Straw', 'Leaves'],
          application: {
            rate: '3-5 tons per hectare',
            timing: 'After harvest or before sowing',
            method: 'Spread as mulch or incorporate',
          },
          expectedImprovement: 'Adds 15-30 kg potassium per hectare',
          cost: {
            min: 500,
            max: 1500,
            currency: 'INR',
          },
        },
      ],
      timeline: severity === 'high' ? '2-3 weeks' : '1-2 months',
      priority: severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'low',
    };
  }

  /**
   * Get pH improvement recommendations
   */
  private getpHImprovement(soilData: SoilHealthData): SoilImprovement {
    const isAcidic = soilData.parameters.pH < 6.0;
    const deviation = isAcidic ? 6.5 - soilData.parameters.pH : soilData.parameters.pH - 7.0;
    const severity = this.getSeverity(deviation, 1.5);

    if (isAcidic) {
      return {
        soilHealthId: soilData.id,
        deficiency: 'pH (Too Acidic)',
        severity,
        recommendations: [
          {
            type: 'chemical',
            title: 'Apply Agricultural Lime',
            description: 'Calcium carbonate neutralizes soil acidity',
            materials: ['Agricultural lime', 'Dolomite lime'],
            application: {
              rate: `${Math.ceil(deviation * 2000)} kg per hectare`,
              timing: '2-3 months before sowing',
              method: 'Broadcast evenly and incorporate to 15 cm depth',
            },
            expectedImprovement: `Increases pH by ${deviation.toFixed(1)} units over 2-3 months`,
            cost: {
              min: 3000,
              max: 8000,
              currency: 'INR',
            },
          },
          {
            type: 'organic',
            title: 'Apply Wood Ash',
            description: 'Natural alkaline material that raises pH',
            materials: ['Wood ash'],
            application: {
              rate: '1000-2000 kg per hectare',
              timing: 'During land preparation',
              method: 'Spread evenly and mix with soil',
            },
            expectedImprovement: 'Increases pH by 0.3-0.5 units',
            cost: {
              min: 1500,
              max: 3000,
              currency: 'INR',
            },
          },
        ],
        timeline: '2-3 months',
        priority: severity === 'high' ? 'high' : 'medium',
      };
    } else {
      return {
        soilHealthId: soilData.id,
        deficiency: 'pH (Too Alkaline)',
        severity,
        recommendations: [
          {
            type: 'chemical',
            title: 'Apply Elemental Sulfur',
            description: 'Sulfur oxidizes to sulfuric acid, lowering pH',
            materials: ['Elemental sulfur', 'Sulfur powder'],
            application: {
              rate: `${Math.ceil(deviation * 500)} kg per hectare`,
              timing: '3-4 months before sowing',
              method: 'Broadcast and incorporate thoroughly',
            },
            expectedImprovement: `Decreases pH by ${deviation.toFixed(1)} units over 3-4 months`,
            cost: {
              min: 4000,
              max: 10000,
              currency: 'INR',
            },
          },
          {
            type: 'organic',
            title: 'Apply Organic Matter',
            description: 'Compost and manure gradually lower pH',
            materials: ['Compost', 'Farmyard manure', 'Peat moss'],
            application: {
              rate: '10-15 tons per hectare',
              timing: 'During land preparation',
              method: 'Spread evenly and incorporate',
            },
            expectedImprovement: 'Decreases pH by 0.2-0.4 units over 6 months',
            cost: {
              min: 5000,
              max: 12000,
              currency: 'INR',
            },
          },
        ],
        timeline: '3-6 months',
        priority: severity === 'high' ? 'high' : 'medium',
      };
    }
  }

  /**
   * Get organic matter improvement recommendations
   */
  private getOrganicMatterImprovement(soilData: SoilHealthData): SoilImprovement {
    const deficit = 0.5 - soilData.parameters.organicCarbon;
    const severity = this.getSeverity(deficit, 0.5);

    return {
      soilHealthId: soilData.id,
      deficiency: 'Organic Matter',
      severity,
      recommendations: [
        {
          type: 'organic',
          title: 'Apply Farmyard Manure',
          description: 'Rich source of organic matter that improves soil structure',
          materials: ['Farmyard manure', 'Cow dung compost'],
          application: {
            rate: '15-20 tons per hectare',
            timing: '3-4 weeks before sowing',
            method: 'Spread evenly and incorporate to 15 cm depth',
          },
          expectedImprovement: 'Increases organic carbon by 0.2-0.3% over 6 months',
          cost: {
            min: 8000,
            max: 15000,
            currency: 'INR',
          },
        },
        {
          type: 'organic',
          title: 'Apply Vermicompost',
          description: 'High-quality compost rich in nutrients and beneficial microbes',
          materials: ['Vermicompost'],
          application: {
            rate: '5-7 tons per hectare',
            timing: '2-3 weeks before sowing',
            method: 'Spread evenly and mix with topsoil',
          },
          expectedImprovement: 'Increases organic carbon by 0.15-0.25%',
          cost: {
            min: 10000,
            max: 18000,
            currency: 'INR',
          },
        },
        {
          type: 'practice',
          title: 'Grow and Incorporate Green Manure',
          description: 'Growing and plowing in green crops adds organic matter',
          materials: ['Dhaincha', 'Sunhemp', 'Cowpea seeds'],
          application: {
            rate: '20-25 kg seeds per hectare',
            timing: 'Grow for 45-60 days, then incorporate',
            method: 'Plow in at flowering stage',
          },
          expectedImprovement: 'Increases organic carbon by 0.1-0.2%',
          cost: {
            min: 2000,
            max: 4000,
            currency: 'INR',
          },
        },
        {
          type: 'practice',
          title: 'Mulch with Crop Residues',
          description: 'Leaving crop residues on field adds organic matter',
          materials: ['Crop residues', 'Straw'],
          application: {
            rate: '4-6 tons per hectare',
            timing: 'After harvest',
            method: 'Spread as mulch or incorporate',
          },
          expectedImprovement: 'Increases organic carbon by 0.08-0.15% over time',
          cost: {
            min: 500,
            max: 1500,
            currency: 'INR',
          },
        },
      ],
      timeline: '6-12 months',
      priority: 'medium',
    };
  }

  /**
   * Determine severity based on deficit
   */
  private getSeverity(deficit: number, baseline: number): 'low' | 'medium' | 'high' {
    const percentage = (deficit / baseline) * 100;

    if (percentage > 50) return 'high';
    if (percentage > 25) return 'medium';
    return 'low';
  }
}

export const improvementAdvisor = new ImprovementAdvisor();
