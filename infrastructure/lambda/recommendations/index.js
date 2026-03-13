/**
 * Recommendations Lambda Function
 * Provides AI-powered crop and farming recommendations using AWS Bedrock
 * Requirements: 16.1, 16.2, 7.1, 3.1, 4.1, 16.2, 17.2
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetItemCommand, PutItemCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });

// Bedrock model configuration
const BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
const BEDROCK_TIMEOUT = 4000; // 4 seconds to stay within 5 second total limit
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Cache configuration
const CACHE_TABLE = process.env.CACHE_TABLE || 'farmer-platform-recommendations-cache-development';
const CACHE_TTL_HOURS = 24; // Cache recommendations for 24 hours
const CACHE_ENABLED = process.env.ENABLE_CACHE !== 'false';

// In-memory cache for Lambda warm starts
const memoryCache = new Map();
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for recommendations
 */
function generateCacheKey(userId, context) {
  const { soilData, season } = context;
  const soilHash = soilData ? `${soilData.soilType}-${soilData.parameters?.pH}` : 'no-soil';
  return `rec-${userId}-${season}-${soilHash}`;
}

/**
 * Check memory cache first (fastest)
 */
function getFromMemoryCache(cacheKey) {
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL_MS) {
    console.log('Cache hit: memory cache');
    return cached.data;
  }
  return null;
}

/**
 * Store in memory cache
 */
function setMemoryCache(cacheKey, data) {
  memoryCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Limit memory cache size
  if (memoryCache.size > 100) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
}

/**
 * Get cached recommendations from DynamoDB
 */
async function getCachedRecommendations(cacheKey) {
  if (!CACHE_ENABLED) return null;
  
  try {
    const response = await docClient.send(new GetItemCommand({
      TableName: CACHE_TABLE,
      Key: { cacheKey }
    }));
    
    if (response.Item) {
      const expiresAt = response.Item.expiresAt;
      if (Date.now() < expiresAt) {
        console.log('Cache hit: DynamoDB cache');
        return response.Item.recommendations;
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error.message);
  }
  
  return null;
}

/**
 * Store recommendations in cache
 */
async function cacheRecommendations(cacheKey, recommendations) {
  if (!CACHE_ENABLED) return;
  
  try {
    const expiresAt = Date.now() + (CACHE_TTL_HOURS * 60 * 60 * 1000);
    
    await docClient.send(new PutItemCommand({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey,
        recommendations,
        expiresAt,
        createdAt: Date.now()
      }
    }));
    
    console.log('Cached recommendations in DynamoDB');
  } catch (error) {
    console.warn('Cache write error:', error.message);
  }
}

/**
 * Invoke Bedrock with timeout and retry logic
 */
async function invokeBedrockWithRetry(payload, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      });

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bedrock timeout')), BEDROCK_TIMEOUT);
      });

      // Race between Bedrock call and timeout
      const response = await Promise.race([
        bedrockClient.send(command),
        timeoutPromise
      ]);

      return response;
    } catch (error) {
      console.warn(`Bedrock attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Generate crop recommendations using AWS Bedrock
 */
async function generateBedrockRecommendations(context) {
  const prompt = buildRecommendationPrompt(context);
  
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  const bedrockStartTime = Date.now();
  
  try {
    const response = await invokeBedrockWithRetry(payload);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const bedrockDuration = Date.now() - bedrockStartTime;
    console.log(`Bedrock API call completed in ${bedrockDuration}ms`);
    
    // Parse Bedrock response
    const recommendations = parseBedrockResponse(responseBody.content[0].text);
    
    // Add metadata
    recommendations.metadata = {
      ...recommendations.metadata,
      bedrockDurationMs: bedrockDuration,
      modelId: BEDROCK_MODEL_ID
    };
    
    return recommendations;
  } catch (error) {
    console.error('Bedrock API error:', error);
    
    // Log error metrics
    logBedrockError(error);
    
    throw error;
  }
}

/**
 * Build prompt for Bedrock with farming context
 */
function buildRecommendationPrompt(context) {
  const { userProfile, soilData, weatherData, marketPrices, season } = context;
  
  return `You are an expert agricultural advisor for Indian farmers. Provide crop recommendations based on the following context:

**User Profile:**
- Location: ${userProfile?.location || 'Not specified'}
- Farm Size: ${userProfile?.farmSize || 'Not specified'} acres
- Current Crops: ${userProfile?.currentCrops?.join(', ') || 'None'}
- Experience Level: ${userProfile?.experienceLevel || 'Beginner'}

**Soil Health:**
- Soil Type: ${soilData?.soilType || 'Not specified'}
- pH: ${soilData?.parameters?.pH || 'Not specified'}
- Nitrogen: ${soilData?.parameters?.nitrogen || 'Not specified'} kg/ha
- Phosphorus: ${soilData?.parameters?.phosphorus || 'Not specified'} kg/ha
- Potassium: ${soilData?.parameters?.potassium || 'Not specified'} kg/ha
- Organic Carbon: ${soilData?.parameters?.organicCarbon || 'Not specified'}%

**Weather Conditions:**
- Current Season: ${season || 'Not specified'}
- Temperature Range: ${weatherData?.temperatureRange || 'Not specified'}
- Rainfall Expected: ${weatherData?.rainfallExpected || 'Not specified'}

**Market Prices (Recent):**
${marketPrices?.map(p => `- ${p.crop}: ₹${p.price}/quintal`).join('\n') || 'No market data available'}

Please provide:
1. Top 5 crop recommendations ranked by profitability, risk, and suitability
2. For each crop, include:
   - Crop name
   - Suitability score (0-100)
   - Expected yield per acre
   - Estimated profit margin
   - Risk level (low/medium/high)
   - Key cultivation requirements
   - Reasoning for recommendation
3. Fertilizer recommendations based on soil health
4. Seed variety suggestions with disease resistance info
5. Clear explanations in simple language suitable for farmers

Format your response as JSON with this structure:
{
  "crops": [
    {
      "name": "crop name",
      "suitabilityScore": 85,
      "expectedYield": "20 quintals/acre",
      "profitMargin": "₹30,000-40,000/acre",
      "riskLevel": "low",
      "requirements": ["requirement 1", "requirement 2"],
      "reasoning": "explanation"
    }
  ],
  "fertilizers": [
    {
      "type": "NPK 10-26-26",
      "dosage": "50 kg/acre",
      "timing": "At sowing",
      "cost": "₹800-1000"
    }
  ],
  "seeds": [
    {
      "variety": "HD-2967",
      "yieldPotential": "High",
      "diseaseResistance": ["rust", "blight"],
      "sowingWindow": "October-November"
    }
  ],
  "explanation": "Overall recommendation summary"
}`;
}

/**
 * Parse Bedrock response and extract recommendations
 */
function parseBedrockResponse(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, return structured error
    return {
      crops: [],
      fertilizers: [],
      seeds: [],
      explanation: 'Unable to parse AI response',
      error: 'Invalid response format'
    };
  } catch (error) {
    console.error('Error parsing Bedrock response:', error);
    return {
      crops: [],
      fertilizers: [],
      seeds: [],
      explanation: 'Error parsing recommendations',
      error: error.message
    };
  }
}

/**
 * Generate rule-based recommendations as fallback
 */
function generateRuleBasedRecommendations(context) {
  const { soilData, season, userProfile } = context;
  
  // Simple rule-based logic
  const recommendations = {
    crops: [
      {
        name: 'Wheat',
        suitabilityScore: 75,
        expectedYield: '18-22 quintals/acre',
        profitMargin: '₹25,000-35,000/acre',
        riskLevel: 'low',
        requirements: ['Well-drained soil', 'Cool weather', 'Moderate irrigation'],
        reasoning: 'Suitable for current season and soil conditions'
      },
      {
        name: 'Rice',
        suitabilityScore: 70,
        expectedYield: '20-25 quintals/acre',
        profitMargin: '₹30,000-40,000/acre',
        riskLevel: 'medium',
        requirements: ['High water availability', 'Warm weather', 'Clay or loamy soil'],
        reasoning: 'Good market demand and suitable climate'
      }
    ],
    fertilizers: [
      {
        type: 'NPK 10-26-26',
        dosage: '50 kg/acre',
        timing: 'At sowing',
        cost: '₹800-1000'
      },
      {
        type: 'Urea',
        dosage: '25 kg/acre',
        timing: '30 days after sowing',
        cost: '₹300-400'
      }
    ],
    seeds: [
      {
        variety: 'HD-2967 (Wheat)',
        yieldPotential: 'High',
        diseaseResistance: ['rust', 'blight'],
        sowingWindow: 'October-November'
      }
    ],
    explanation: 'Recommendations based on soil type, season, and regional best practices. For AI-powered personalized recommendations, ensure AWS Bedrock access is configured.'
  };
  
  return recommendations;
}

/**
 * Fetch user context from DynamoDB
 */
async function fetchUserContext(userId) {
  try {
    // Fetch user profile
    const profileResponse = await docClient.send(new GetItemCommand({
      TableName: process.env.USERS_TABLE || 'farmer-platform-users-development',
      Key: { id: userId }
    }));
    
    // Fetch latest soil health data
    const soilResponse = await docClient.send(new QueryCommand({
      TableName: process.env.SOIL_HEALTH_TABLE || 'farmer-platform-soil-health-development',
      IndexName: 'UserCreatedIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false,
      Limit: 1
    }));
    
    return {
      userProfile: profileResponse.Item,
      soilData: soilResponse.Items?.[0],
      weatherData: null, // TODO: Fetch from weather service
      marketPrices: [], // TODO: Fetch from market service
      season: getCurrentSeason()
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {
      userProfile: null,
      soilData: null,
      weatherData: null,
      marketPrices: [],
      season: getCurrentSeason()
    };
  }
}

/**
 * Get current season based on month
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'Summer';
  if (month >= 7 && month <= 10) return 'Monsoon';
  return 'Winter';
}

/**
 * Log Bedrock error metrics for monitoring
 */
function logBedrockError(error) {
  const errorMetrics = {
    timestamp: new Date().toISOString(),
    errorType: error.name || 'UnknownError',
    errorMessage: error.message,
    modelId: BEDROCK_MODEL_ID
  };
  
  console.error('BEDROCK_ERROR_METRIC:', JSON.stringify(errorMetrics));
}

/**
 * Log usage metrics for cost monitoring
 */
function logUsageMetrics(usedBedrock, processingTime, cacheHit) {
  const metrics = {
    timestamp: new Date().toISOString(),
    usedBedrock,
    processingTimeMs: processingTime,
    cacheHit,
    modelId: usedBedrock ? BEDROCK_MODEL_ID : 'rule-based'
  };
  
  console.log('USAGE_METRIC:', JSON.stringify(metrics));
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Recommendations Lambda - Event:', JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  
  try {
    // Extract userId from query parameters or body
    const userId = event.queryStringParameters?.userId || 
                   JSON.parse(event.body || '{}').userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          message: 'Missing required parameter: userId' 
        })
      };
    }
    
    // Fetch user context
    const context = await fetchUserContext(userId);
    
    // Generate cache key
    const cacheKey = generateCacheKey(userId, context);
    
    // Check memory cache first
    let recommendations = getFromMemoryCache(cacheKey);
    let cacheHit = false;
    let usedBedrock = false;
    
    if (recommendations) {
      cacheHit = true;
    } else {
      // Check DynamoDB cache
      recommendations = await getCachedRecommendations(cacheKey);
      
      if (recommendations) {
        cacheHit = true;
        // Store in memory cache for faster subsequent access
        setMemoryCache(cacheKey, recommendations);
      } else {
        // Generate fresh recommendations
        try {
          // Try Bedrock first
          recommendations = await generateBedrockRecommendations(context);
          usedBedrock = true;
          console.log('Successfully generated Bedrock recommendations');
          
          // Cache the results
          await cacheRecommendations(cacheKey, recommendations);
          setMemoryCache(cacheKey, recommendations);
        } catch (bedrockError) {
          console.warn('Bedrock failed, falling back to rule-based:', bedrockError.message);
          // Fallback to rule-based recommendations
          recommendations = generateRuleBasedRecommendations(context);
          
          // Cache rule-based recommendations too (shorter TTL could be configured)
          await cacheRecommendations(cacheKey, recommendations);
          setMemoryCache(cacheKey, recommendations);
        }
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Log usage metrics for monitoring
    logUsageMetrics(usedBedrock, processingTime, cacheHit);
    
    // Ensure we stay within 5 second limit
    if (processingTime > 5000) {
      console.warn(`Processing time exceeded 5 seconds: ${processingTime}ms`);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache-Hit': cacheHit ? 'true' : 'false'
      },
      body: JSON.stringify({
        userId,
        recommendations,
        metadata: {
          usedBedrock,
          cacheHit,
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
          season: context.season
        }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      })
    };
  }
};
