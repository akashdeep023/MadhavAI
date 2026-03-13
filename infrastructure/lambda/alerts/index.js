/**
 * Alerts Lambda Function
 * Manages and sends alerts to farmers
 * Requirements: 2.6, 9.1-9.10
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand,
  ScanCommand 
} = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const ALERTS_TABLE = process.env.ALERTS_TABLE || 'madhavai-alerts-development';
const USERS_TABLE = process.env.USERS_TABLE || 'madhavai-users-development';

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Alerts Lambda - Event:', JSON.stringify(event, null, 2));
  
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.requestContext?.http?.path || '';
  
  try {
    // Route based on HTTP method and path
    if (httpMethod === 'POST' && path.includes('/alerts/schedule')) {
      // POST /alerts/schedule
      return await scheduleAlert(event);
    } else if (httpMethod === 'GET' && path.match(/\/alerts\/user\/[^/]+$/)) {
      // GET /alerts/user/{userId}
      return await getUserAlerts(event);
    } else if (httpMethod === 'POST' && path.includes('/alerts/process-due')) {
      // POST /alerts/process-due - Background job
      return await processDueAlerts(event);
    } else if (httpMethod === 'PUT' && path.match(/\/alerts\/[^/]+\/read$/)) {
      // PUT /alerts/{alertId}/read
      return await markAlertAsRead(event);
    } else if (httpMethod === 'DELETE' && path.match(/\/alerts\/[^/]+$/)) {
      // DELETE /alerts/{alertId}
      return await cancelAlert(event);
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
 * Schedule a new alert
 * Requirements: 9.1-9.5
 */
async function scheduleAlert(event) {
  const body = JSON.parse(event.body || '{}');
  const {
    userId,
    type,
    title,
    message,
    scheduledTime,
    priority,
    actionable,
    actionUrl,
    metadata
  } = body;
  
  // Validate required fields
  if (!userId || !type || !title || !message || !scheduledTime) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ 
        error: 'Missing required fields: userId, type, title, message, scheduledTime' 
      })
    };
  }
  
  // Validate scheduled time is in the future
  const scheduledDate = new Date(scheduledTime);
  if (scheduledDate <= new Date()) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Scheduled time must be in the future' })
    };
  }
  
  const alertId = generateAlertId();
  const now = new Date().toISOString();
  
  const alert = {
    alertId,
    userId,
    type,
    title,
    message,
    scheduledTime: scheduledDate.toISOString(),
    priority: priority || 'medium',
    status: 'scheduled',
    actionable: actionable || false,
    actionUrl: actionUrl || null,
    metadata: metadata || {},
    createdAt: now,
    updatedAt: now
  };
  
  // Store in DynamoDB
  await docClient.send(new PutCommand({
    TableName: ALERTS_TABLE,
    Item: alert
  }));
  
  console.log(`Alert scheduled: ${alertId}`);
  
  return {
    statusCode: 201,
    headers: corsHeaders(),
    body: JSON.stringify({
      alertId,
      message: 'Alert scheduled successfully'
    })
  };
}

/**
 * Get alerts for a user
 * Requirements: 9.8
 */
async function getUserAlerts(event) {
  const userId = event.pathParameters?.userId;
  const queryParams = event.queryStringParameters || {};
  const days = parseInt(queryParams.days || '7', 10);
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'userId is required' })
    };
  }
  
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  const params = {
    TableName: ALERTS_TABLE,
    IndexName: 'UserScheduledIndex',
    KeyConditionExpression: 'userId = :userId AND scheduledTime BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':start': now.toISOString(),
      ':end': endDate.toISOString()
    }
  };
  
  const result = await docClient.send(new QueryCommand(params));
  const alerts = result.Items || [];
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Process due alerts (background job)
 * Requirements: 9.8
 */
async function processDueAlerts(event) {
  console.log('Processing due alerts');
  
  const now = new Date().toISOString();
  
  // Get all scheduled alerts that are due
  const params = {
    TableName: ALERTS_TABLE,
    FilterExpression: '#status = :status AND scheduledTime <= :now',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'scheduled',
      ':now': now
    }
  };
  
  const result = await docClient.send(new ScanCommand(params));
  const dueAlerts = result.Items || [];
  
  console.log(`Found ${dueAlerts.length} due alerts`);
  
  let processed = 0;
  let failed = 0;
  
  // Process each alert
  for (const alert of dueAlerts) {
    try {
      // Get user phone number
      const userResult = await docClient.send(new QueryCommand({
        TableName: USERS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': alert.userId
        }
      }));
      
      const user = userResult.Items?.[0];
      
      if (user && user.mobileNumber) {
        // Send SMS notification
        await snsClient.send(new PublishCommand({
          PhoneNumber: user.mobileNumber,
          Message: `${alert.title}\n\n${alert.message}`,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional'
            }
          }
        }));
        
        console.log(`SMS sent for alert ${alert.alertId}`);
      }
      
      // Mark alert as sent
      await docClient.send(new UpdateCommand({
        TableName: ALERTS_TABLE,
        Key: { alertId: alert.alertId },
        UpdateExpression: 'SET #status = :status, sentTime = :sentTime, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'sent',
          ':sentTime': now,
          ':updatedAt': now
        }
      }));
      
      processed++;
    } catch (error) {
      console.error(`Failed to process alert ${alert.alertId}:`, error);
      failed++;
    }
  }
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      message: 'Due alerts processed',
      total: dueAlerts.length,
      processed,
      failed
    })
  };
}

/**
 * Mark alert as read
 */
async function markAlertAsRead(event) {
  const alertId = event.pathParameters?.alertId;
  
  if (!alertId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'alertId is required' })
    };
  }
  
  const now = new Date().toISOString();
  
  await docClient.send(new UpdateCommand({
    TableName: ALERTS_TABLE,
    Key: { alertId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'read',
      ':updatedAt': now
    }
  }));
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      message: 'Alert marked as read'
    })
  };
}

/**
 * Cancel an alert
 */
async function cancelAlert(event) {
  const alertId = event.pathParameters?.alertId;
  
  if (!alertId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'alertId is required' })
    };
  }
  
  const now = new Date().toISOString();
  
  await docClient.send(new UpdateCommand({
    TableName: ALERTS_TABLE,
    Key: { alertId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'dismissed',
      ':updatedAt': now
    },
    ConditionExpression: '#status = :scheduledStatus',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':scheduledStatus': 'scheduled'
    }
  }));
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      message: 'Alert cancelled successfully'
    })
  };
}

/**
 * Generate unique alert ID
 */
function generateAlertId() {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * CORS headers
 */
function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };
}
