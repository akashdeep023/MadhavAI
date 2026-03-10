/**
 * Training Lambda Function
 * Manages training content and lessons for farmers
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

exports.handler = async (event) => {
  console.log('Training Lambda - Event:', JSON.stringify(event, null, 2));
  
  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Training Lambda',
        lessons: [
          { id: '1', title: 'Modern Farming Techniques', duration: '30 min', language: 'Hindi' },
          { id: '2', title: 'Organic Farming Basics', duration: '45 min', language: 'Hindi' }
        ],
        timestamp: new Date().toISOString()
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
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
};
