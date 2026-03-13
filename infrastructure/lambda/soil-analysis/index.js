const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const textractClient = new TextractClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const SOIL_HEALTH_TABLE = process.env.SOIL_HEALTH_TABLE || 'madhavai-soil-health-production';
const BUCKET_NAME = process.env.SOIL_HEALTH_IMAGES_BUCKET;

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
    
    // Store analysis results in DynamoDB
    const analysisRecord = {
      id: analysisId,
      userId: userId,
      imageKey: imageKey,
      status: 'completed',
      extractedData: extractedData,
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
