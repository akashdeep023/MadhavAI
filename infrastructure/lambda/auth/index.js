/**
 * Authentication Lambda Function
 * Handles user authentication and authorization
 * Matches endpoints expected by src/services/api/authApi.ts
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const crypto = require('crypto');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const USERS_TABLE = process.env.USERS_TABLE || 'farmer-platform-users-production';
const OTP_EXPIRY_MINUTES = 10;

exports.handler = async (event) => {
  console.log('Auth Lambda - Event:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // Route to appropriate handler based on path
    if (httpMethod === 'POST' && path.includes('/send-otp')) {
      return await handleSendOTP(requestBody);
    } else if (httpMethod === 'POST' && path.includes('/verify-otp')) {
      return await handleVerifyOTP(requestBody);
    } else if (httpMethod === 'POST' && path.includes('/refresh-token')) {
      return await handleRefreshToken(requestBody);
    } else if (httpMethod === 'POST' && path.includes('/logout')) {
      return await handleLogout(requestBody);
    }
    
    return createResponse(404, { message: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

/**
 * POST /auth/send-otp
 * Send OTP to mobile number
 */
async function handleSendOTP(body) {
  const { mobileNumber } = body;
  
  if (!mobileNumber || !isValidMobileNumber(mobileNumber)) {
    return createResponse(400, { 
      success: false,
      message: 'Invalid mobile number' 
    });
  }
  
  try {
    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Store OTP in DynamoDB
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        mobileNumber,
        otp,
        expiresAt,
        attempts: 0,
        createdAt: new Date().toISOString()
      }
    }));
    
    // Send OTP via SMS using SNS
    let smsSent = false;
    try {
      await snsClient.send(new PublishCommand({
        PhoneNumber: `+91${mobileNumber}`, // Add country code for India
        Message: `Your MadhavAI verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`
      }));
      console.log(`OTP sent successfully to ${mobileNumber}`);
      smsSent = true;
    } catch (smsError) {
      console.error('SMS sending failed (SNS not active):', smsError);
      console.log(`[FALLBACK] OTP for ${mobileNumber}: ${otp}`);
    }
    
    return createResponse(200, {
      success: true,
      message: smsSent ? 'OTP sent successfully' : 'OTP generated (SMS inactive)',
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      // Return OTP in-app when SNS SMS is not active — remove this once SNS is enabled
      devOtp: smsSent ? undefined : otp,
      smsActive: smsSent
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    return createResponse(500, {
      success: false,
      message: 'Failed to send OTP'
    });
  }
}

/**
 * POST /auth/verify-otp
 * Verify OTP and authenticate user
 */
async function handleVerifyOTP(body) {
  const { mobileNumber, otp, deviceId } = body;
  
  if (!mobileNumber || !otp || !deviceId) {
    return createResponse(400, {
      success: false,
      message: 'Missing required fields'
    });
  }
  
  try {
    // Get stored OTP from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { mobileNumber }
    }));
    
    if (!result.Item) {
      return createResponse(400, {
        success: false,
        message: 'OTP not found. Please request a new OTP.'
      });
    }
    
    const storedData = result.Item;
    
    // Check if OTP expired
    if (Date.now() > storedData.expiresAt) {
      return createResponse(400, {
        success: false,
        message: 'OTP expired. Please request a new OTP.'
      });
    }
    
    // Check if too many attempts
    if (storedData.attempts >= 3) {
      return createResponse(400, {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }
    
    // Verify OTP
    if (storedData.otp !== otp) {
      // Increment attempts
      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { mobileNumber },
        UpdateExpression: 'SET attempts = attempts + :inc',
        ExpressionAttributeValues: { ':inc': 1 }
      }));
      
      return createResponse(400, {
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    // OTP verified successfully - generate auth token
    const authToken = generateAuthToken(mobileNumber, deviceId);
    const refreshToken = generateRefreshToken(mobileNumber, deviceId);
    
    // Store tokens in DynamoDB
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        mobileNumber,
        deviceId,
        authToken,
        refreshToken,
        tokenExpiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        lastLogin: new Date().toISOString()
      }
    }));
    
    return createResponse(200, {
      success: true,
      message: 'Authentication successful',
      authToken: {
        token: authToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
      }
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return createResponse(500, {
      success: false,
      message: 'Failed to verify OTP'
    });
  }
}

/**
 * POST /auth/refresh-token
 * Refresh authentication token
 */
async function handleRefreshToken(body) {
  const { token } = body;
  
  if (!token) {
    return createResponse(400, { message: 'Refresh token required' });
  }
  
  try {
    // Query DynamoDB to find user with this refresh token
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'RefreshTokenIndex', // GSI on refreshToken
      KeyConditionExpression: 'refreshToken = :token',
      ExpressionAttributeValues: {
        ':token': token
      }
    }));
    
    if (!result.Items || result.Items.length === 0) {
      return createResponse(401, { 
        message: 'Invalid refresh token' 
      });
    }
    
    const userData = result.Items[0];
    
    // Check if token expired
    if (Date.now() > userData.tokenExpiresAt) {
      return createResponse(401, { 
        message: 'Refresh token expired. Please login again.' 
      });
    }
    
    // Generate new auth token (keep same refresh token)
    const newAuthToken = generateAuthToken(userData.mobileNumber, userData.deviceId);
    const newExpiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    // Update tokens in DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { mobileNumber: userData.mobileNumber },
      UpdateExpression: 'SET authToken = :authToken, tokenExpiresAt = :expiresAt, lastRefresh = :now',
      ExpressionAttributeValues: {
        ':authToken': newAuthToken,
        ':expiresAt': newExpiresAt,
        ':now': new Date().toISOString()
      }
    }));
    
    return createResponse(200, {
      token: newAuthToken,
      refreshToken: token, // Same refresh token
      expiresAt: new Date(newExpiresAt).toISOString()
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    return createResponse(500, { message: 'Failed to refresh token' });
  }
}

/**
 * POST /auth/logout
 * Logout user and invalidate tokens
 */
async function handleLogout(body) {
  const { token } = body;
  
  if (!token) {
    return createResponse(400, { message: 'Auth token required' });
  }
  
  try {
    // Query DynamoDB to find user with this auth token
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'AuthTokenIndex', // GSI on authToken
      KeyConditionExpression: 'authToken = :token',
      ExpressionAttributeValues: {
        ':token': token
      }
    }));
    
    if (!result.Items || result.Items.length === 0) {
      // Token not found, but return success anyway (idempotent)
      return createResponse(200, { message: 'Logout successful' });
    }
    
    const userData = result.Items[0];
    
    // Invalidate tokens by removing them from DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { mobileNumber: userData.mobileNumber },
      UpdateExpression: 'REMOVE authToken, refreshToken, tokenExpiresAt SET logoutAt = :now',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString()
      }
    }));
    
    console.log(`User ${userData.mobileNumber} logged out successfully`);
    
    return createResponse(200, { 
      message: 'Logout successful' 
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    // Return success even on error (idempotent operation)
    return createResponse(200, { message: 'Logout successful' });
  }
}

// Helper functions

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function isValidMobileNumber(mobileNumber) {
  // Indian mobile number validation (10 digits)
  return /^[6-9]\d{9}$/.test(mobileNumber);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateAuthToken(mobileNumber, deviceId) {
  const payload = `${mobileNumber}:${deviceId}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function generateRefreshToken(mobileNumber, deviceId) {
  const payload = `${mobileNumber}:${deviceId}:${Date.now()}:refresh`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
