# Authentication Lambda Implementation

## Overview

The auth Lambda function is now fully implemented to match the endpoints expected by the mobile app's `src/services/api/authApi.ts`.

## Endpoints Implemented

### 1. POST /auth/send-otp
**Purpose:** Send OTP to user's mobile number

**Request:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

**Implementation:**
- Validates Indian mobile number format (10 digits starting with 6-9)
- Generates 6-digit OTP
- Stores OTP in DynamoDB with 10-minute expiry
- Sends OTP via SMS (SNS) - currently logs to console for development
- Returns success response

### 2. POST /auth/verify-otp
**Purpose:** Verify OTP and authenticate user

**Request:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456",
  "deviceId": "device-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "authToken": {
    "token": "auth-token-hash",
    "refreshToken": "refresh-token-hash",
    "expiresAt": "2026-03-11T10:30:00.000Z"
  }
}
```

**Implementation:**
- Retrieves stored OTP from DynamoDB
- Validates OTP hasn't expired (10 minutes)
- Checks attempt limit (max 3 attempts)
- Verifies OTP matches
- Generates auth token and refresh token
- Stores tokens in DynamoDB
- Returns tokens to client

### 3. POST /auth/refresh-token
**Purpose:** Refresh expired authentication token

**Request:**
```json
{
  "token": "refresh-token-hash"
}
```

**Response:**
```json
{
  "token": "new-auth-token-hash",
  "refreshToken": "refresh-token-hash",
  "expiresAt": "2026-03-11T10:30:00.000Z"
}
```

**Implementation:**
- Validates refresh token
- Generates new auth token
- Returns new token with 24-hour expiry

### 4. POST /auth/logout
**Purpose:** Logout user and invalidate tokens

**Request:**
```json
{
  "token": "auth-token-hash"
}
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

**Implementation:**
- Invalidates auth token in database
- Returns success response

## Security Features

### OTP Security
- 6-digit random OTP
- 10-minute expiry
- Maximum 3 verification attempts
- Stored securely in DynamoDB

### Token Security
- SHA-256 hashed tokens
- 24-hour token expiry
- Refresh token support
- Device ID binding

### API Security
- CORS headers configured
- Input validation
- Error handling
- Rate limiting (TODO: implement in API Gateway)

## Database Schema

### DynamoDB Table: `farmer-platform-users-production`

**For OTP Storage:**
```javascript
{
  mobileNumber: "9876543210",  // Partition key
  otp: "123456",
  expiresAt: 1710144600000,    // Timestamp
  attempts: 0,
  createdAt: "2026-03-10T10:30:00.000Z"
}
```

**For Token Storage:**
```javascript
{
  mobileNumber: "9876543210",  // Partition key
  deviceId: "device-uuid",
  authToken: "token-hash",
  refreshToken: "refresh-token-hash",
  tokenExpiresAt: 1710144600000,
  lastLogin: "2026-03-10T10:30:00.000Z"
}
```

## Configuration

### Environment Variables
- `AWS_REGION` - AWS region (default: ap-south-1)
- `USERS_TABLE` - DynamoDB table name
- `SNS_TOPIC_ARN` - SNS topic for alerts (optional)

### Constants
- `OTP_EXPIRY_MINUTES` - 10 minutes
- `TOKEN_EXPIRY_HOURS` - 24 hours
- `MAX_OTP_ATTEMPTS` - 3 attempts

## TODO: Production Enhancements

### 1. SMS Sending
Currently OTP is logged to console. Enable SNS SMS:

```javascript
await snsClient.send(new PublishCommand({
  PhoneNumber: mobileNumber,
  Message: `Your MadhavAI OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`
}));
```

**Requirements:**
- Configure SNS for SMS in AWS Console
- Add SMS spending limits
- Verify phone numbers for testing

### 2. JWT Tokens
Replace simple hash tokens with JWT:

```javascript
const jwt = require('jsonwebtoken');

function generateAuthToken(mobileNumber, deviceId) {
  return jwt.sign(
    { mobileNumber, deviceId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}
```

### 3. Rate Limiting
Add rate limiting to prevent abuse:
- Max 3 OTP requests per mobile number per hour
- Max 5 verification attempts per mobile number per hour
- Implement in API Gateway or Lambda

### 4. User Registration
Add user profile creation after first OTP verification:
- Store user details (name, location, farm info)
- Link to farmer profile table
- Send welcome notification

### 5. Multi-Factor Authentication
Add optional MFA for enhanced security:
- Email verification
- Biometric authentication
- Security questions

### 6. Audit Logging
Log all authentication events:
- OTP requests
- Login attempts (success/failure)
- Token refreshes
- Logouts
- Store in CloudWatch Logs or separate audit table

## Testing

### Local Testing
```bash
# Test OTP send
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'

# Test OTP verify
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","otp":"123456","deviceId":"test-device"}'
```

### Integration Testing
```bash
# Run from mobile app
npm test -- src/services/api/__tests__/authApi.test.ts
```

## Error Handling

### Common Errors

| Status Code | Error | Reason |
|-------------|-------|--------|
| 400 | Invalid mobile number | Format validation failed |
| 400 | OTP expired | OTP older than 10 minutes |
| 400 | Invalid OTP | OTP doesn't match |
| 400 | Too many attempts | More than 3 failed attempts |
| 404 | OTP not found | No OTP request for this number |
| 500 | Internal server error | Database or SMS service error |

## Monitoring

### CloudWatch Metrics
- OTP send success/failure rate
- OTP verification success/failure rate
- Average OTP verification time
- Token refresh rate
- Error rate by endpoint

### CloudWatch Alarms
- High error rate (> 5%)
- High OTP failure rate (> 20%)
- SMS delivery failures
- DynamoDB throttling

## Cost Optimization

### DynamoDB
- Use on-demand billing for variable traffic
- Set TTL on OTP records (auto-delete after 1 hour)
- Use GSI for device-based queries if needed

### SNS SMS
- SMS costs ~$0.00645 per message in India
- Implement OTP request throttling
- Consider alternative SMS providers for cost savings

### Lambda
- Current memory: 512 MB
- Typical execution time: < 500ms
- Cost: ~$0.0000002 per request
- Optimize cold starts with provisioned concurrency if needed
