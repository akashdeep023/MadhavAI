const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const textractClient = new TextractClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const SOIL_HEALTH_TABLE = process.env.SOIL_HEALTH_TABLE || 'madhavai-soil-health-production';
const BUCKET_NAME = process.env.SOIL_HEALTH_IMAGES_BUCKET;
const BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0'; // Claude 3 Sonnet

/**
 * Lambda handler for soil health image analysis
 * Supports:
 * - POST /soil-health/analyze - Trigger image analysis with Textract
 * - GET /soil-health/analysis/{analysisId} - Get analysis results
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const path = event.path || event.rawPath || '';
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || '';
    
    // Route to appropriate handler
    if (path.includes('/analyze') && httpMethod === 'POST') {
      return await handleAnalyzeRequest(event);
    }
    
    if (path.includes('/analysis/') && httpMethod === 'GET') {
      return await handleGetAnalysisRequest(event);
    }
    
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Not found' })
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
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

/**
 * Trigger soil health card image analysis using AWS Textract
 */
async function handleAnalyzeRequest(event) {
  const body = JSON.parse(event.body || '{}');
  const { userId, imageKey } = body;
  
  // Validation
  if (!userId || !imageKey) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Missing required fields: userId, imageKey' 
      })
    };
  }
  
  const analysisId = uuidv4();
  
  try {
    // Call Textract to analyze the document
    console.log(`Starting Textract analysis for image: ${imageKey}`);
    
    const textractCommand = new AnalyzeDocumentCommand({
      Document: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: imageKey
        }
      },
      FeatureTypes: ['TABLES', 'FORMS']
    });
    
    const textractResponse = await textractClient.send(textractCommand);
    console.log(`Textract analysis completed. Blocks found: ${textractResponse.Blocks?.length || 0}`);
    
    // Extract soil parameters from Textract response
    const extractedData = extractSoilParameters(textractResponse.Blocks || []);
    
    // Use Bedrock for intelligent analysis and recommendations
    let bedrockAnalysis = null;
    try {
      bedrockAnalysis = await analyzeSoilWithBedrock(extractedData);
      console.log('Bedrock analysis completed successfully');
    } catch (bedrockError) {
      console.error('Bedrock analysis failed, using rule-based fallback:', bedrockError);
      bedrockAnalysis = generateRuleBasedAnalysis(extractedData);
    }
    
    // Store analysis results in DynamoDB
    const analysisRecord = {
      id: analysisId,
      userId: userId,
      imageKey: imageKey,
      status: 'completed',
      extractedData: extractedData,
      analysis: bedrockAnalysis,
      rawTextractData: {
        blockCount: textractResponse.Blocks?.length || 0,
        documentMetadata: textractResponse.DocumentMetadata
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: SOIL_HEALTH_TABLE,
      Item: analysisRecord
    }));
    
    console.log(`Analysis results stored with ID: ${analysisId}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        analysisId: analysisId,
        status: 'completed',
        extractedData: extractedData,
        analysis: bedrockAnalysis,
        message: 'Soil health card analysis completed successfully'
      })
    };
    
  } catch (error) {
    console.error('Textract analysis error:', error);
    
    // Store failed analysis record
    const failedRecord = {
      id: analysisId,
      userId: userId,
      imageKey: imageKey,
      status: 'failed',
      error: error.message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      await docClient.send(new PutCommand({
        TableName: SOIL_HEALTH_TABLE,
        Item: failedRecord
      }));
    } catch (dbError) {
      console.error('Failed to store error record:', dbError);
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        analysisId: analysisId,
        status: 'failed',
        error: 'Failed to analyze soil health card',
        message: error.message
      })
    };
  }
}

/**
 * Get analysis results by ID
 */
async function handleGetAnalysisRequest(event) {
  const pathParts = (event.path || event.rawPath || '').split('/');
  const analysisId = pathParts[pathParts.length - 1];
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Missing analysisId in path' 
      })
    };
  }
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: SOIL_HEALTH_TABLE,
      Key: { id: analysisId }
    }));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Analysis not found' 
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.Item)
    };
    
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch analysis results',
        message: error.message 
      })
    };
  }
}

/**
 * Extract soil parameters from Textract blocks
 * Looks for common soil health card parameters
 */
function extractSoilParameters(blocks) {
  const parameters = {
    pH: null,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    organicCarbon: null,
    electricalConductivity: null,
    sulfur: null,
    zinc: null,
    iron: null,
    manganese: null,
    copper: null,
    boron: null,
    confidence: {}
  };
  
  // Extract text from all blocks
  const textBlocks = blocks.filter(block => block.BlockType === 'LINE');
  const allText = textBlocks.map(block => block.Text).join(' ');
  
  console.log('Extracted text:', allText);
  
  // Parameter patterns to search for
  const patterns = {
    pH: /pH[:\s]*([0-9]+\.?[0-9]*)/i,
    nitrogen: /(?:nitrogen|N)[:\s]*([0-9]+\.?[0-9]*)/i,
    phosphorus: /(?:phosphorus|P)[:\s]*([0-9]+\.?[0-9]*)/i,
    potassium: /(?:potassium|K)[:\s]*([0-9]+\.?[0-9]*)/i,
    organicCarbon: /(?:organic carbon|OC)[:\s]*([0-9]+\.?[0-9]*)/i,
    electricalConductivity: /(?:EC|electrical conductivity)[:\s]*([0-9]+\.?[0-9]*)/i,
    sulfur: /(?:sulfur|S)[:\s]*([0-9]+\.?[0-9]*)/i,
    zinc: /(?:zinc|Zn)[:\s]*([0-9]+\.?[0-9]*)/i,
    iron: /(?:iron|Fe)[:\s]*([0-9]+\.?[0-9]*)/i,
    manganese: /(?:manganese|Mn)[:\s]*([0-9]+\.?[0-9]*)/i,
    copper: /(?:copper|Cu)[:\s]*([0-9]+\.?[0-9]*)/i,
    boron: /(?:boron|B)[:\s]*([0-9]+\.?[0-9]*)/i
  };
  
  // Extract each parameter
  for (const [param, pattern] of Object.entries(patterns)) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      parameters[param] = parseFloat(match[1]);
      
      // Find confidence score from the block containing this value
      const matchingBlock = textBlocks.find(block => 
        block.Text && block.Text.includes(match[0])
      );
      if (matchingBlock && matchingBlock.Confidence) {
        parameters.confidence[param] = matchingBlock.Confidence;
      }
    }
  }
  
  // Extract lab name and sample ID if present
  const labNameMatch = allText.match(/(?:lab|laboratory)[:\s]*([A-Za-z\s]+)/i);
  if (labNameMatch && labNameMatch[1]) {
    parameters.labName = labNameMatch[1].trim();
  }
  
  const sampleIdMatch = allText.match(/(?:sample|ID)[:\s]*([A-Z0-9-]+)/i);
  if (sampleIdMatch && sampleIdMatch[1]) {
    parameters.sampleId = sampleIdMatch[1].trim();
  }
  
  // Calculate overall confidence
  const confidenceValues = Object.values(parameters.confidence);
  if (confidenceValues.length > 0) {
    parameters.overallConfidence = 
      confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
  }
  
  return parameters;
}


/**
 * Analyze soil health data using AWS Bedrock for intelligent recommendations
 */
async function analyzeSoilWithBedrock(extractedData) {
  const prompt = buildSoilAnalysisPrompt(extractedData);
  
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
  };
  
  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload)
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Parse the Bedrock response
  const analysisText = responseBody.content[0].text;
  
  // Extract structured data from the response
  return parseBedrockResponse(analysisText, extractedData);
}

/**
 * Build prompt for Bedrock soil analysis
 */
function buildSoilAnalysisPrompt(extractedData) {
  const { pH, nitrogen, phosphorus, potassium, organicCarbon, electricalConductivity } = extractedData;
  
  return `You are an agricultural soil health expert. Analyze the following soil test results and provide recommendations in simple language suitable for Indian farmers.

Soil Test Results:
- pH: ${pH || 'Not available'}
- Nitrogen (N): ${nitrogen || 'Not available'} kg/ha
- Phosphorus (P): ${phosphorus || 'Not available'} kg/ha
- Potassium (K): ${potassium || 'Not available'} kg/ha
- Organic Carbon: ${organicCarbon || 'Not available'}%
- Electrical Conductivity: ${electricalConductivity || 'Not available'} dS/m

Please provide:
1. Overall soil health assessment (poor/fair/good/excellent)
2. Simple explanation of what these values mean for crop growth
3. List of nutrient deficiencies (if any)
4. Top 5 suitable crops for this soil condition with brief reasons
5. Specific soil improvement recommendations with practical steps
6. Estimated timeframe for soil improvement

Format your response as JSON with the following structure:
{
  "overallHealth": "good/fair/poor/excellent",
  "simpleExplanation": "Brief explanation in simple language",
  "deficiencies": ["list of deficiencies"],
  "suitableCrops": [
    {
      "cropName": "crop name",
      "suitabilityScore": 85,
      "reason": "why this crop is suitable"
    }
  ],
  "improvements": [
    {
      "issue": "specific issue",
      "recommendation": "practical recommendation",
      "timeframe": "estimated time",
      "priority": "high/medium/low"
    }
  ],
  "keyInsights": ["important insights for the farmer"]
}

Provide practical, actionable advice that an Indian farmer can implement.`;
}

/**
 * Parse Bedrock response into structured format
 */
function parseBedrockResponse(analysisText, extractedData) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        source: 'bedrock',
        model: BEDROCK_MODEL_ID,
        confidence: extractedData.overallConfidence || 0
      };
    }
  } catch (error) {
    console.error('Failed to parse Bedrock JSON response:', error);
  }
  
  // Fallback: return raw text with basic structure
  return {
    overallHealth: 'unknown',
    simpleExplanation: analysisText,
    source: 'bedrock-text',
    model: BEDROCK_MODEL_ID,
    confidence: extractedData.overallConfidence || 0
  };
}

/**
 * Generate rule-based analysis as fallback when Bedrock fails
 */
function generateRuleBasedAnalysis(extractedData) {
  const { pH, nitrogen, phosphorus, potassium, organicCarbon } = extractedData;
  
  const analysis = {
    overallHealth: 'unknown',
    simpleExplanation: '',
    deficiencies: [],
    suitableCrops: [],
    improvements: [],
    keyInsights: [],
    source: 'rule-based',
    confidence: extractedData.overallConfidence || 0
  };
  
  // Assess overall health
  let healthScore = 0;
  let factors = 0;
  
  if (pH !== null) {
    factors++;
    if (pH >= 6.0 && pH <= 7.5) healthScore += 25;
    else if (pH >= 5.5 && pH <= 8.0) healthScore += 15;
    else healthScore += 5;
  }
  
  if (nitrogen !== null) {
    factors++;
    if (nitrogen >= 280) healthScore += 25;
    else if (nitrogen >= 200) healthScore += 15;
    else healthScore += 5;
  }
  
  if (phosphorus !== null) {
    factors++;
    if (phosphorus >= 25) healthScore += 25;
    else if (phosphorus >= 15) healthScore += 15;
    else healthScore += 5;
  }
  
  if (potassium !== null) {
    factors++;
    if (potassium >= 280) healthScore += 25;
    else if (potassium >= 200) healthScore += 15;
    else healthScore += 5;
  }
  
  const avgScore = factors > 0 ? healthScore / factors : 0;
  
  if (avgScore >= 20) analysis.overallHealth = 'excellent';
  else if (avgScore >= 15) analysis.overallHealth = 'good';
  else if (avgScore >= 10) analysis.overallHealth = 'fair';
  else analysis.overallHealth = 'poor';
  
  // Check for deficiencies
  if (nitrogen !== null && nitrogen < 280) {
    analysis.deficiencies.push('Nitrogen (N)');
    analysis.improvements.push({
      issue: 'Low nitrogen levels',
      recommendation: 'Apply urea or organic compost. Use green manure crops like dhaincha.',
      timeframe: '2-3 months',
      priority: 'high'
    });
  }
  
  if (phosphorus !== null && phosphorus < 25) {
    analysis.deficiencies.push('Phosphorus (P)');
    analysis.improvements.push({
      issue: 'Low phosphorus levels',
      recommendation: 'Apply single super phosphate (SSP) or rock phosphate.',
      timeframe: '3-4 months',
      priority: 'high'
    });
  }
  
  if (potassium !== null && potassium < 280) {
    analysis.deficiencies.push('Potassium (K)');
    analysis.improvements.push({
      issue: 'Low potassium levels',
      recommendation: 'Apply muriate of potash (MOP) or wood ash.',
      timeframe: '2-3 months',
      priority: 'medium'
    });
  }
  
  if (pH !== null && (pH < 6.0 || pH > 7.5)) {
    if (pH < 6.0) {
      analysis.improvements.push({
        issue: 'Acidic soil (low pH)',
        recommendation: 'Apply lime (calcium carbonate) to raise pH.',
        timeframe: '4-6 months',
        priority: 'high'
      });
    } else {
      analysis.improvements.push({
        issue: 'Alkaline soil (high pH)',
        recommendation: 'Apply gypsum or sulfur to lower pH.',
        timeframe: '4-6 months',
        priority: 'high'
      });
    }
  }
  
  if (organicCarbon !== null && organicCarbon < 0.5) {
    analysis.improvements.push({
      issue: 'Low organic matter',
      recommendation: 'Add farmyard manure, compost, or practice crop rotation with legumes.',
      timeframe: '6-12 months',
      priority: 'medium'
    });
  }
  
  // Suggest suitable crops based on soil conditions
  if (analysis.overallHealth === 'excellent' || analysis.overallHealth === 'good') {
    analysis.suitableCrops = [
      { cropName: 'Wheat', suitabilityScore: 85, reason: 'Good nutrient levels support wheat growth' },
      { cropName: 'Rice', suitabilityScore: 80, reason: 'Suitable pH and nutrient balance for rice' },
      { cropName: 'Cotton', suitabilityScore: 75, reason: 'Adequate potassium for cotton fiber quality' },
      { cropName: 'Sugarcane', suitabilityScore: 70, reason: 'Good soil health supports long-duration crop' },
      { cropName: 'Vegetables', suitabilityScore: 85, reason: 'Balanced nutrients ideal for vegetable cultivation' }
    ];
  } else {
    analysis.suitableCrops = [
      { cropName: 'Pulses (Moong/Urad)', suitabilityScore: 75, reason: 'Legumes can fix nitrogen and improve soil' },
      { cropName: 'Millets', suitabilityScore: 70, reason: 'Drought-resistant and low nutrient requirement' },
      { cropName: 'Groundnut', suitabilityScore: 65, reason: 'Tolerates moderate nutrient levels' }
    ];
  }
  
  // Generate simple explanation
  analysis.simpleExplanation = `Your soil health is ${analysis.overallHealth}. `;
  if (analysis.deficiencies.length > 0) {
    analysis.simpleExplanation += `The soil needs more ${analysis.deficiencies.join(', ')}. `;
  }
  analysis.simpleExplanation += `Following the recommendations will improve your soil quality and crop yield.`;
  
  // Key insights
  if (analysis.deficiencies.length === 0) {
    analysis.keyInsights.push('Your soil has good nutrient balance');
  }
  if (pH !== null && pH >= 6.0 && pH <= 7.5) {
    analysis.keyInsights.push('Soil pH is in the ideal range for most crops');
  }
  if (analysis.improvements.length > 0) {
    analysis.keyInsights.push(`${analysis.improvements.length} improvement actions recommended`);
  }
  
  return analysis;
}
