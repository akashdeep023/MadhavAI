/**
 * Schemes Lambda Function
 * Manages government schemes and subsidies information
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  GetCommand,
  PutCommand,
  QueryCommand 
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const SCHEMES_TABLE = process.env.SCHEMES_TABLE || 'madhavai-schemes-development';

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Schemes Lambda - Event:', JSON.stringify(event, null, 2));
  
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.requestContext?.http?.path || '';
  
  try {
    // Route based on HTTP method and path
    if (httpMethod === 'GET' && path.includes('/schemes')) {
      if (path.match(/\/schemes\/[^/]+$/)) {
        // GET /schemes/{schemeId}
        return await getSchemeById(event);
      } else {
        // GET /schemes (with optional query params)
        return await getAllSchemes(event);
      }
    } else if (httpMethod === 'POST' && path.includes('/schemes/check-eligibility')) {
      // POST /schemes/check-eligibility
      return await checkEligibility(event);
    } else if (httpMethod === 'POST' && path.includes('/schemes/seed')) {
      // POST /schemes/seed - Admin endpoint to populate schemes
      return await seedSchemes(event);
    } else if (httpMethod === 'POST' && path.includes('/schemes/schedule-deadline-alerts')) {
      // POST /schemes/schedule-deadline-alerts
      return await scheduleDeadlineAlerts(event);
    }
    
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      })
    };
  }
};

/**
 * Get all schemes with optional filtering
 */
async function getAllSchemes(event) {
  const queryParams = event.queryStringParameters || {};
  const state = queryParams.state;
  const district = queryParams.district;
  const category = queryParams.category;
  
  let schemes;
  
  // If state is provided, use StateIndex GSI
  if (state) {
    const params = {
      TableName: SCHEMES_TABLE,
      IndexName: 'StateIndex',
      KeyConditionExpression: '#state = :state',
      ExpressionAttributeNames: {
        '#state': 'state'
      },
      ExpressionAttributeValues: {
        ':state': state
      }
    };
    
    const result = await docClient.send(new QueryCommand(params));
    schemes = result.Items || [];
  } else {
    // Scan all schemes
    const params = {
      TableName: SCHEMES_TABLE
    };
    
    const result = await docClient.send(new ScanCommand(params));
    schemes = result.Items || [];
  }
  
  // Filter by district if provided
  if (district) {
    schemes = schemes.filter(s => !s.district || s.district === district);
  }
  
  // Filter by category if provided
  if (category) {
    schemes = schemes.filter(s => s.category === category);
  }
  
  // Filter only active schemes
  schemes = schemes.filter(s => s.isActive !== false);
  
  // Convert date strings to ISO format for consistency
  schemes = schemes.map(formatScheme);
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      schemes,
      count: schemes.length,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Get scheme by ID
 */
async function getSchemeById(event) {
  const schemeId = event.pathParameters?.schemeId;
  
  if (!schemeId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'schemeId is required' })
    };
  }
  
  const params = {
    TableName: SCHEMES_TABLE,
    Key: { schemeId }
  };
  
  const result = await docClient.send(new GetCommand(params));
  
  if (!result.Item) {
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Scheme not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      scheme: formatScheme(result.Item),
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Check eligibility for a scheme
 * Requirements: 2.2, 2.3, 2.4
 */
async function checkEligibility(event) {
  const body = JSON.parse(event.body || '{}');
  const { schemeId, userProfile } = body;
  
  if (!schemeId || !userProfile) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'schemeId and userProfile are required' })
    };
  }
  
  // Get scheme from DynamoDB
  const params = {
    TableName: SCHEMES_TABLE,
    Key: { schemeId }
  };
  
  const result = await docClient.send(new GetCommand(params));
  
  if (!result.Item) {
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Scheme not found' })
    };
  }
  
  const scheme = result.Item;
  
  // Check eligibility
  const eligibilityResult = checkSchemeEligibility(scheme, userProfile);
  
  // If not eligible, find alternative schemes
  if (!eligibilityResult.isEligible) {
    const alternatives = await findAlternativeSchemes(scheme, userProfile);
    eligibilityResult.alternativeSchemes = alternatives.map(s => s.schemeId);
  }
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      eligibilityResult,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Find alternative schemes for ineligible users
 * Requirements: 2.4
 */
async function findAlternativeSchemes(originalScheme, userProfile) {
  try {
    // Get all schemes in the same category
    const params = {
      TableName: SCHEMES_TABLE,
      FilterExpression: 'category = :category AND schemeId <> :originalId AND isActive = :active',
      ExpressionAttributeValues: {
        ':category': originalScheme.category,
        ':originalId': originalScheme.schemeId,
        ':active': true
      }
    };
    
    const result = await docClient.send(new ScanCommand(params));
    const schemes = result.Items || [];
    
    // Check eligibility for each alternative
    const eligibleAlternatives = schemes
      .map(scheme => ({
        scheme,
        eligibility: checkSchemeEligibility(scheme, userProfile)
      }))
      .filter(item => item.eligibility.isEligible)
      .sort((a, b) => b.eligibility.confidence - a.eligibility.confidence)
      .map(item => item.scheme);
    
    return eligibleAlternatives.slice(0, 3); // Return top 3 alternatives
  } catch (error) {
    console.error('Error finding alternative schemes:', error);
    return [];
  }
}

/**
 * Check scheme eligibility logic
 * Requirements: 2.2, 2.4
 */
function checkSchemeEligibility(scheme, userProfile) {
  const reasons = [];
  const missingCriteria = [];
  let isEligible = true;
  let confidence = 100;
  
  // Check if scheme is active
  if (!scheme.isActive) {
    return {
      schemeId: scheme.schemeId,
      isEligible: false,
      reasons: ['Scheme is currently inactive'],
      confidence: 100
    };
  }
  
  const criteria = scheme.eligibilityCriteria || {};
  
  // Check farm size
  if (criteria.minFarmSize !== undefined || criteria.maxFarmSize !== undefined) {
    const farmSize = userProfile.farmSize;
    
    if (!farmSize) {
      missingCriteria.push('Farm size information');
      confidence -= 20;
    } else {
      if (criteria.minFarmSize !== undefined && farmSize < criteria.minFarmSize) {
        isEligible = false;
        reasons.push(`Farm size (${farmSize} acres) is below minimum requirement (${criteria.minFarmSize} acres)`);
      }
      
      if (criteria.maxFarmSize !== undefined && farmSize > criteria.maxFarmSize) {
        isEligible = false;
        reasons.push(`Farm size (${farmSize} acres) exceeds maximum limit (${criteria.maxFarmSize} acres)`);
      }
      
      if (isEligible && (criteria.minFarmSize !== undefined || criteria.maxFarmSize !== undefined)) {
        reasons.push(`Farm size (${farmSize} acres) meets requirements`);
      }
    }
  }
  
  // Check location (state)
  if (criteria.allowedStates && criteria.allowedStates.length > 0) {
    const userState = userProfile.location?.state;
    
    if (!userState) {
      missingCriteria.push('State information');
      confidence -= 25;
    } else if (!criteria.allowedStates.includes(userState)) {
      isEligible = false;
      reasons.push(`Scheme not available in ${userState}. Available in: ${criteria.allowedStates.join(', ')}`);
    } else {
      reasons.push(`Location (${userState}) is eligible`);
    }
  }
  
  // Check location (district)
  if (criteria.allowedDistricts && criteria.allowedDistricts.length > 0) {
    const userDistrict = userProfile.location?.district;
    
    if (!userDistrict) {
      missingCriteria.push('District information');
      confidence -= 15;
    } else if (!criteria.allowedDistricts.includes(userDistrict)) {
      isEligible = false;
      reasons.push(`Scheme not available in ${userDistrict} district`);
    } else {
      reasons.push(`District (${userDistrict}) is eligible`);
    }
  }
  
  // Check crops
  if (criteria.allowedCrops && criteria.allowedCrops.length > 0) {
    const userCrops = userProfile.primaryCrops || [];
    
    if (userCrops.length === 0) {
      missingCriteria.push('Primary crops information');
      confidence -= 15;
    } else {
      const matchingCrops = userCrops.filter(crop => criteria.allowedCrops.includes(crop));
      
      if (matchingCrops.length === 0) {
        isEligible = false;
        reasons.push(`None of your crops (${userCrops.join(', ')}) are eligible. Eligible crops: ${criteria.allowedCrops.join(', ')}`);
      } else {
        reasons.push(`Your crops (${matchingCrops.join(', ')}) are eligible`);
      }
    }
  }
  
  // Check farmer category (based on farm size)
  if (criteria.farmerCategory && criteria.farmerCategory.length > 0) {
    const farmSize = userProfile.farmSize;
    
    if (!farmSize) {
      missingCriteria.push('Farm size for category determination');
      confidence -= 20;
    } else {
      const category = determineFarmerCategory(farmSize);
      
      if (!criteria.farmerCategory.includes(category)) {
        isEligible = false;
        reasons.push(`Farmer category (${category}) not eligible. Eligible categories: ${criteria.farmerCategory.join(', ')}`);
      } else {
        reasons.push(`Farmer category (${category}) is eligible`);
      }
    }
  }
  
  // Add general message if eligible
  if (isEligible && reasons.length === 0) {
    reasons.push('You meet all eligibility criteria for this scheme');
  }
  
  return {
    schemeId: scheme.schemeId,
    isEligible,
    reasons,
    missingCriteria: missingCriteria.length > 0 ? missingCriteria : undefined,
    confidence: Math.max(confidence, 0)
  };
}

/**
 * Determine farmer category based on farm size
 */
function determineFarmerCategory(farmSize) {
  if (farmSize === 0) return 'landless';
  if (farmSize <= 1) return 'marginal';
  if (farmSize <= 2) return 'small';
  if (farmSize <= 10) return 'medium';
  return 'large';
}

/**
 * Format scheme for response
 */
function formatScheme(scheme) {
  return {
    ...scheme,
    id: scheme.schemeId, // Add id field for frontend compatibility
    applicationDeadline: scheme.applicationDeadline ? new Date(scheme.applicationDeadline).toISOString() : undefined,
    createdAt: scheme.createdAt ? new Date(scheme.createdAt).toISOString() : undefined,
    updatedAt: scheme.updatedAt ? new Date(scheme.updatedAt).toISOString() : undefined
  };
}

/**
 * CORS headers
 */
function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
}

/**
 * Seed schemes data (admin endpoint)
 * This should be called once to populate the DynamoDB table
 */
async function seedSchemes(event) {
  const schemes = [
    {
      schemeId: 'pm-kisan-2024',
      name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
      description: 'Direct income support of ₹6,000 per year to all farmer families across the country in three equal installments of ₹2,000 each.',
      category: 'subsidy',
      eligibilityCriteria: {
        maxFarmSize: 10,
        landOwnership: ['owned'],
        farmerCategory: ['small', 'marginal', 'medium']
      },
      benefits: [
        '₹6,000 per year in three installments',
        'Direct bank transfer',
        'No paperwork required after registration'
      ],
      applicationDeadline: '2024-12-31',
      applicationUrl: 'https://pmkisan.gov.in/',
      requiredDocuments: [
        'Aadhaar Card',
        'Bank Account Details',
        'Land Ownership Documents',
        'Mobile Number'
      ],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Visit PM-KISAN Portal',
          description: 'Go to the official PM-KISAN website or visit your nearest Common Service Center (CSC).',
          estimatedTime: '10 minutes'
        },
        {
          stepNumber: 2,
          title: 'Fill Registration Form',
          description: 'Provide Aadhaar number, bank account details, and land records.',
          requiredDocuments: ['Aadhaar Card', 'Bank Passbook', 'Land Records'],
          estimatedTime: '15 minutes'
        },
        {
          stepNumber: 3,
          title: 'Submit Application',
          description: 'Submit the form online or at CSC. You will receive a registration number.',
          estimatedTime: '5 minutes'
        },
        {
          stepNumber: 4,
          title: 'Verification',
          description: 'Your application will be verified by local authorities within 15-30 days.',
          estimatedTime: '15-30 days'
        }
      ],
      contactInfo: {
        phone: '011-23382401',
        email: 'pmkisan-ict@gov.in',
        website: 'https://pmkisan.gov.in/'
      },
      state: 'all',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      schemeId: 'pmfby-2024',
      name: 'PMFBY (Pradhan Mantri Fasal Bima Yojana)',
      description: 'Comprehensive crop insurance scheme providing financial support to farmers in case of crop loss due to natural calamities, pests, and diseases.',
      category: 'insurance',
      eligibilityCriteria: {
        farmerCategory: ['small', 'marginal', 'medium', 'large'],
        landOwnership: ['owned', 'leased', 'sharecropped']
      },
      benefits: [
        'Coverage for all stages of crop cycle',
        'Low premium rates (2% for Kharif, 1.5% for Rabi)',
        'Quick claim settlement',
        'Coverage for post-harvest losses'
      ],
      applicationDeadline: '2024-06-30',
      applicationUrl: 'https://pmfby.gov.in/',
      requiredDocuments: [
        'Aadhaar Card',
        'Bank Account Details',
        'Land Records or Tenancy Agreement',
        'Sowing Certificate'
      ],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Visit Bank or CSC',
          description: 'Visit your bank branch, CSC, or insurance company office before sowing season.',
          estimatedTime: '30 minutes'
        },
        {
          stepNumber: 2,
          title: 'Fill Proposal Form',
          description: 'Complete the crop insurance proposal form with crop and land details.',
          requiredDocuments: ['Land Records', 'Bank Details'],
          estimatedTime: '20 minutes'
        },
        {
          stepNumber: 3,
          title: 'Pay Premium',
          description: 'Pay the subsidized premium amount (2% for Kharif, 1.5% for Rabi crops).',
          estimatedTime: '10 minutes'
        },
        {
          stepNumber: 4,
          title: 'Receive Policy',
          description: 'Get your insurance policy document and keep it safe.',
          estimatedTime: '1-2 days'
        }
      ],
      contactInfo: {
        phone: '011-23382012',
        email: 'pmfby-helpdesk@gov.in',
        website: 'https://pmfby.gov.in/'
      },
      state: 'Maharashtra',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      schemeId: 'kcc-2024',
      name: 'Kisan Credit Card (KCC)',
      description: 'Credit facility for farmers to meet their agricultural needs including crop cultivation, post-harvest expenses, and maintenance of farm assets.',
      category: 'loan',
      eligibilityCriteria: {
        farmerCategory: ['small', 'marginal', 'medium', 'large'],
        landOwnership: ['owned', 'leased']
      },
      benefits: [
        'Credit limit up to ₹3 lakh at 7% interest',
        'Flexible repayment terms',
        'Insurance coverage included',
        'No collateral required for loans up to ₹1.6 lakh'
      ],
      requiredDocuments: [
        'Aadhaar Card',
        'PAN Card',
        'Land Ownership Documents',
        'Bank Account Statement',
        'Passport Size Photos'
      ],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Visit Bank Branch',
          description: 'Visit your nearest bank branch that offers KCC facility.',
          estimatedTime: '1 hour'
        },
        {
          stepNumber: 2,
          title: 'Submit Application',
          description: 'Fill KCC application form and submit required documents.',
          requiredDocuments: ['Aadhaar', 'PAN', 'Land Records', 'Photos'],
          estimatedTime: '30 minutes'
        },
        {
          stepNumber: 3,
          title: 'Field Verification',
          description: 'Bank will conduct field verification of your land and crops.',
          estimatedTime: '3-7 days'
        },
        {
          stepNumber: 4,
          title: 'Receive KCC',
          description: 'Once approved, you will receive your Kisan Credit Card.',
          estimatedTime: '7-15 days'
        }
      ],
      contactInfo: {
        phone: '1800-180-1111',
        email: 'kcc-support@nabard.org',
        website: 'https://www.nabard.org/kcc.aspx'
      },
      state: 'all',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      schemeId: 'pkvy-2024',
      name: 'PKVY (Paramparagat Krishi Vikas Yojana)',
      description: 'Scheme to promote organic farming and certification. Provides financial assistance of ₹50,000 per hectare for 3 years for organic farming.',
      category: 'organic_farming',
      eligibilityCriteria: {
        farmerCategory: ['small', 'marginal', 'medium'],
        minFarmSize: 0.5
      },
      benefits: [
        '₹50,000 per hectare over 3 years',
        'Organic certification support',
        'Training on organic farming practices',
        'Market linkage for organic produce'
      ],
      applicationDeadline: '2024-08-31',
      requiredDocuments: [
        'Aadhaar Card',
        'Land Ownership Documents',
        'Bank Account Details',
        'Group Formation Certificate (if applicable)'
      ],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Form Farmer Group',
          description: 'Form a group of 50 farmers or join an existing organic farming group.',
          estimatedTime: '1-2 weeks'
        },
        {
          stepNumber: 2,
          title: 'Contact Agriculture Department',
          description: 'Contact your district agriculture office to register your group.',
          estimatedTime: '1 day'
        },
        {
          stepNumber: 3,
          title: 'Submit Proposal',
          description: 'Submit group proposal with land details and organic farming plan.',
          requiredDocuments: ['Group Certificate', 'Land Records', 'Farming Plan'],
          estimatedTime: '1 week'
        },
        {
          stepNumber: 4,
          title: 'Receive Approval',
          description: 'Once approved, receive financial assistance in installments.',
          estimatedTime: '1-2 months'
        }
      ],
      contactInfo: {
        phone: '011-23070271',
        email: 'pkvy@gov.in',
        website: 'https://pgsindia-ncof.gov.in/'
      },
      state: 'Maharashtra',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      schemeId: 'smam-2024',
      name: 'SMAM (Sub-Mission on Agricultural Mechanization)',
      description: 'Provides financial assistance for purchase of agricultural machinery and equipment. Subsidy of 40-50% on farm equipment.',
      category: 'equipment',
      eligibilityCriteria: {
        farmerCategory: ['small', 'marginal', 'medium', 'large'],
        minFarmSize: 1
      },
      benefits: [
        '40-50% subsidy on farm equipment',
        'Priority to SC/ST/Women farmers (50% subsidy)',
        'Custom Hiring Centers support',
        'Training on equipment operation'
      ],
      applicationDeadline: '2024-09-30',
      requiredDocuments: [
        'Aadhaar Card',
        'Land Ownership Documents',
        'Bank Account Details',
        'Caste Certificate (if applicable)',
        'Quotation from Authorized Dealer'
      ],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Register on Portal',
          description: 'Register on the state agriculture mechanization portal.',
          estimatedTime: '15 minutes'
        },
        {
          stepNumber: 2,
          title: 'Select Equipment',
          description: 'Choose equipment from approved list and get quotation from authorized dealer.',
          estimatedTime: '1-2 days'
        },
        {
          stepNumber: 3,
          title: 'Submit Application',
          description: 'Submit online application with quotation and required documents.',
          requiredDocuments: ['Aadhaar', 'Land Records', 'Quotation'],
          estimatedTime: '30 minutes'
        },
        {
          stepNumber: 4,
          title: 'Purchase Equipment',
          description: 'After approval, purchase equipment and claim subsidy.',
          estimatedTime: '15-30 days'
        }
      ],
      contactInfo: {
        phone: '011-23389357',
        email: 'smam@gov.in',
        website: 'https://agrimachinery.nic.in/'
      },
      state: 'Maharashtra',
      district: 'Pune',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      schemeId: 'pmksy-2024',
      name: 'PMKSY (Pradhan Mantri Krishi Sinchayee Yojana)',
      description: 'Scheme to expand cultivable area under irrigation, improve water use efficiency, and promote precision irrigation (drip/sprinkler).',
      category: 'irrigation',
      eligibilityCriteria: {
        farmerCategory: ['small', 'marginal', 'medium', 'large'],
        minFarmSize: 0.5
      },
      benefits: [
        'Subsidy on drip/sprinkler irrigation systems',
        'Support for water conservation structures',
        'Watershed development assistance',
        'Technical guidance on water management'
      ],
      requiredDocuments: [
        'Aadhaar Card',
        'Land Ownership Documents',
        'Bank Account Details',
        'Water Source Certificate',
        'Soil Test Report'
      ],
      applicationSteps: [
        {
          stepNumber: 1,
          title: 'Soil and Water Testing',
          description: 'Get soil test and water availability assessment done.',
          estimatedTime: '1 week'
        },
        {
          stepNumber: 2,
          title: 'Visit Agriculture Office',
          description: 'Contact district agriculture or horticulture office.',
          estimatedTime: '1 day'
        },
        {
          stepNumber: 3,
          title: 'Submit Application',
          description: 'Submit application with land details and irrigation plan.',
          requiredDocuments: ['Land Records', 'Soil Test', 'Water Certificate'],
          estimatedTime: '1 day'
        },
        {
          stepNumber: 4,
          title: 'Installation and Subsidy',
          description: 'Install irrigation system through approved vendor and receive subsidy.',
          estimatedTime: '1-2 months'
        }
      ],
      contactInfo: {
        phone: '011-23070433',
        email: 'pmksy@gov.in',
        website: 'https://pmksy.gov.in/'
      },
      state: 'Maharashtra',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  // Insert all schemes
  for (const scheme of schemes) {
    await docClient.send(new PutCommand({
      TableName: SCHEMES_TABLE,
      Item: scheme
    }));
  }
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      message: 'Schemes seeded successfully',
      count: schemes.length
    })
  };
}

/**
 * Schedule deadline alerts for eligible schemes
 * Requirements: 2.6
 */
async function scheduleDeadlineAlerts(event) {
  const body = JSON.parse(event.body || '{}');
  const { userId, userProfile } = body;
  
  if (!userId || !userProfile) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'userId and userProfile are required' })
    };
  }
  
  try {
    // Get schemes with upcoming deadlines (within 30 days)
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const params = {
      TableName: SCHEMES_TABLE,
      FilterExpression: 'isActive = :active AND applicationDeadline BETWEEN :now AND :future',
      ExpressionAttributeValues: {
        ':active': true,
        ':now': now.toISOString(),
        ':future': futureDate.toISOString()
      }
    };
    
    const result = await docClient.send(new ScanCommand(params));
    const schemes = result.Items || [];
    
    let alertsScheduled = 0;
    const scheduledAlerts = [];
    
    // For each scheme, check eligibility and schedule alerts
    for (const scheme of schemes) {
      const eligibilityResult = checkSchemeEligibility(scheme, userProfile);
      
      if (eligibilityResult.isEligible) {
        const deadline = new Date(scheme.applicationDeadline);
        const intervals = [7, 3, 1]; // Days before deadline
        
        for (const days of intervals) {
          const alertTime = new Date(deadline);
          alertTime.setDate(alertTime.getDate() - days);
          
          // Only schedule if alert time is in the future
          if (alertTime > now) {
            const alertData = {
              userId,
              type: 'scheme',
              title: 'Scheme Deadline Reminder',
              message: `${scheme.name} application deadline is in ${days} day${days > 1 ? 's' : ''}`,
              scheduledTime: alertTime.toISOString(),
              priority: days === 1 ? 'high' : 'medium',
              actionable: true,
              actionUrl: `/schemes/${scheme.schemeId}`,
              metadata: {
                schemeId: scheme.schemeId,
                deadline: deadline.toISOString(),
                daysRemaining: days
              }
            };
            
            scheduledAlerts.push(alertData);
            alertsScheduled++;
          }
        }
      }
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        message: 'Deadline alerts scheduled successfully',
        alertsScheduled,
        eligibleSchemes: schemes.length,
        alerts: scheduledAlerts
      })
    };
  } catch (error) {
    console.error('Error scheduling deadline alerts:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ 
        error: 'Failed to schedule deadline alerts',
        message: error.message 
      })
    };
  }
}
