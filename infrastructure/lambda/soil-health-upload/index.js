const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUCKET_NAME = process.env.SOIL_HEALTH_IMAGES_BUCKET;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png'];
const PRESIGNED_URL_EXPIRY = 300; // 5 minutes

/**
 * Lambda handler for soil health image upload operations
 * Supports:
 * - POST /soil-health/upload/presigned-url - Generate presigned URL for upload
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const path = event.path || event.rawPath || '';
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || '';
    
    // Route to appropriate handler
    if (path.includes('/presigned-url') && httpMethod === 'POST') {
      return await handlePresignedUrlRequest(event);
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
 * Generate presigned URL for secure image upload
 * Validates file size and content type before generating URL
 */
async function handlePresignedUrlRequest(event) {
  const body = JSON.parse(event.body || '{}');
  const { userId, contentType, fileSize, fileName } = body;
  
  // Validation
  if (!userId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Missing required field: userId' 
      })
    };
  }
  
  if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Invalid content type. Only JPEG and PNG images are allowed.',
        allowedTypes: ALLOWED_CONTENT_TYPES
      })
    };
  }
  
  if (!fileSize || fileSize > MAX_FILE_SIZE) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        maxSize: MAX_FILE_SIZE
      })
    };
  }
  
  // Generate unique key for the image
  const timestamp = Date.now();
  const fileExtension = contentType === 'image/jpeg' ? 'jpg' : 'png';
  const sanitizedFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'soil-health-card';
  const key = `soil-health-cards/${userId}/${timestamp}-${uuidv4()}-${sanitizedFileName}.${fileExtension}`;
  
  // Generate presigned URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Metadata: {
      userId: userId,
      uploadTimestamp: timestamp.toString()
    }
  });
  
  const presignedUrl = await getSignedUrl(s3Client, command, { 
    expiresIn: PRESIGNED_URL_EXPIRY 
  });
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      presignedUrl,
      key,
      expiresIn: PRESIGNED_URL_EXPIRY,
      uploadInstructions: {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        }
      }
    })
  };
}
