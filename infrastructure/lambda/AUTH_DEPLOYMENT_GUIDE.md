# Authentication System - Complete Deployment Guide

## Overview

This guide will help you deploy a fully functional authentication system with real OTP SMS delivery to mobile phones.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile App                                                  │
│  - User enters mobile number                                │
│  - Receives OTP via SMS                                     │
│  - Enters OTP to login                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS API Gateway                                             │
│  - /auth/send-otp                                           │
│  - /auth/verify-otp                                         │
│  - /auth/refresh-token                                      │
│  - /auth/logout                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Lambda Function (auth)                                      │
│  - Generates OTP                                            │
│  - Sends SMS via SNS                                        │
│  - Validates OTP                                            │
│  - Issues auth tokens                                       │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────┐
│  DynamoDB            │    │  Amazon SNS              │
│  - Store OTPs        │    │  - Send SMS to mobile    │
│  - Store tokens      │    │  - Delivery tracking     │
│  - User sessions     │    │                          │
└──────────────────────┘    └──────────────────────────┘
```

## Prerequisites

### 1. AWS Account Setup
- Active AWS account
- IAM user with appropriate permissions
- AWS CLI configured locally

### 2. AWS SNS SMS Configuration

**CRITICAL: You must configure SNS for SMS before deployment**

#### Step 1: Request SMS Spending Limit Increase
1. Go to AWS Console → SNS → Text messaging (SMS)
2. Click "Request spending limit increase"
3. Fill out the form:
   - **Use case**: Transactional (OTP messages)
   - **Monthly SMS spend**: Start with $10-50
   - **Expected daily volume**: Estimate your users
   - **Opt-in process**: Describe your app
4. Wait for approval (usually 24-48 hours)

#### Step 2: Configure SMS Settings
1. Go to SNS → Text messaging (SMS) → SMS preferences
2. Set:
   - **Default message type**: Transactional
   - **Default sender ID**: MadhavAI (if supported in your region)
   - **Account spend limit**: Set your monthly budget

#### Step 3: Test SMS Sending
```bash
# Test SMS from AWS CLI
aws sns publish \
  --phone-number "+919876543210" \
  --message "Test message from MadhavAI" \
  --region ap-south-1
```

### 3. Required IAM Permissions

The Lambda execution role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/farmer-platform-users-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Deployment Steps

### Step 1: Configure Environment Variables

Add to `.env.backend`:
```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB
USERS_TABLE=farmer-platform-users-production

# SNS (optional - for monitoring)
SNS_TOPIC_ARN=arn:aws:sns:ap-south-1:xxxx:madhavai-alerts

# Alert Email
ALERT_EMAIL=team@madhavai.com
```

### Step 2: Add GitHub Secrets

Go to GitHub → Settings → Secrets and variables → Actions

Add these secrets:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
ALERT_EMAIL=team@madhavai.com
```

### Step 3: Setup Terraform Backend

```bash
# Run this once before first deployment
chmod +x infrastructure/scripts/setup-backend.sh
./infrastructure/scripts/setup-backend.sh
```

This creates:
- S3 bucket: `farmer-platform-terraform-state`
- DynamoDB table: `terraform-state-lock`

### Step 4: Build Lambda Functions

```bash
# Build all Lambda functions including auth
npm run build:lambda
```

This creates:
- `dist/lambda/auth.zip`
- `dist/lambda/recommendations.zip`
- `dist/lambda/schemes.zip`
- `dist/lambda/market-prices.zip`
- `dist/lambda/alerts.zip`
- `dist/lambda/training.zip`

### Step 5: Deploy Infrastructure

```bash
# Deploy to staging first
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh staging ap-south-1
```

This will:
1. Initialize Terraform
2. Create DynamoDB tables
3. Deploy Lambda functions
4. Setup API Gateway
5. Configure IAM roles
6. Output API URLs

### Step 6: Get API URL

After deployment:
```bash
cd infrastructure/terraform
terraform output api_gateway_url
```

Example output:
```
https://abc123xyz.execute-api.ap-south-1.amazonaws.com/staging
```

### Step 7: Update Mobile App Configuration

Add the API URL to GitHub Secrets:
```
API_BASE_URL=https://abc123xyz.execute-api.ap-south-1.amazonaws.com/staging
```

Or update `.env` locally:
```bash
API_BASE_URL=https://abc123xyz.execute-api.ap-south-1.amazonaws.com/staging
```

### Step 8: Test Authentication Flow

#### Test 1: Send OTP
```bash
curl -X POST https://your-api-url/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'
```

Expected response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

**Check your phone for SMS!**

#### Test 2: Verify OTP
```bash
curl -X POST https://your-api-url/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber":"9876543210",
    "otp":"123456",
    "deviceId":"test-device-123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "authToken": {
    "token": "auth-token-hash...",
    "refreshToken": "refresh-token-hash...",
    "expiresAt": "2026-03-11T10:30:00.000Z"
  }
}
```

#### Test 3: Test from Mobile App
```bash
# Run the mobile app
npm run android

# Or iOS
npm run ios
```

1. Open the app
2. Enter your mobile number
3. Click "Send OTP"
4. Check your phone for SMS
5. Enter the OTP
6. Should login successfully!

## Monitoring & Troubleshooting

### Check Lambda Logs
```bash
# View auth Lambda logs
aws logs tail /aws/lambda/farmer-platform-auth-staging --follow
```

### Check DynamoDB
```bash
# List items in users table
aws dynamodb scan \
  --table-name farmer-platform-users-staging \
  --region ap-south-1
```

### Check SNS SMS Delivery
```bash
# Check SMS delivery status
aws sns get-sms-attributes --region ap-south-1
```

### Common Issues

#### Issue 1: SMS Not Received
**Symptoms:** OTP API succeeds but no SMS received

**Solutions:**
1. Check SNS spending limit not exceeded:
   ```bash
   aws sns get-sms-attributes --region ap-south-1
   ```

2. Check CloudWatch logs for SMS errors:
   ```bash
   aws logs tail /aws/lambda/farmer-platform-auth-staging --follow
   ```

3. Verify phone number format:
   - Must be 10 digits
   - Must start with 6-9
   - Country code (+91) added automatically

4. Check SNS SMS sandbox mode:
   - In sandbox, you can only send to verified numbers
   - Request production access in SNS console

#### Issue 2: OTP Expired
**Symptoms:** "OTP expired" error

**Solution:** OTP expires after 10 minutes. Request new OTP.

#### Issue 3: Too Many Attempts
**Symptoms:** "Too many failed attempts" error

**Solution:** 
- Maximum 3 verification attempts per OTP
- Request new OTP to reset attempts

#### Issue 4: Lambda Timeout
**Symptoms:** 500 error, "Task timed out" in logs

**Solution:**
- Increase Lambda timeout in `terraform/lambda.tf`
- Check DynamoDB and SNS latency
- Optimize database queries

#### Issue 5: DynamoDB Throttling
**Symptoms:** "ProvisionedThroughputExceededException"

**Solution:**
- Switch to on-demand billing mode
- Or increase provisioned capacity
- Add exponential backoff retry logic

## Cost Estimation

### SMS Costs (SNS)
- India: ~₹0.50 per SMS (~$0.00645)
- 1000 OTPs/day = ₹500/day = ₹15,000/month
- 10,000 OTPs/day = ₹5,000/day = ₹1,50,000/month

### Lambda Costs
- 512 MB memory, ~500ms execution
- 1 million requests/month = ~$0.20
- Essentially free for most use cases

### DynamoDB Costs
- On-demand billing
- 1 million reads = $0.25
- 1 million writes = $1.25
- Very affordable for auth use case

### API Gateway Costs
- $3.50 per million requests
- First 1 million requests free (first 12 months)

### Total Estimated Cost
- **Low traffic** (1000 users/day): ~₹500-1000/month
- **Medium traffic** (10,000 users/day): ~₹5,000-10,000/month
- **High traffic** (100,000 users/day): ~₹50,000-1,00,000/month

**Note:** SMS is the primary cost driver!

## Security Best Practices

### 1. Rate Limiting
Add API Gateway rate limiting:
```terraform
resource "aws_api_gateway_usage_plan" "auth" {
  name = "auth-rate-limit"
  
  throttle_settings {
    rate_limit  = 10    # 10 requests per second
    burst_limit = 20    # 20 burst requests
  }
  
  quota_settings {
    limit  = 1000       # 1000 requests per day per user
    period = "DAY"
  }
}
```

### 2. IP Blocking
Block suspicious IPs in API Gateway or CloudFront

### 3. OTP Brute Force Protection
- Maximum 3 attempts per OTP
- 10-minute OTP expiry
- Rate limit OTP requests (max 3 per hour per number)

### 4. Token Security
- Use JWT tokens (upgrade from simple hash)
- Short token expiry (24 hours)
- Refresh token rotation
- Device binding

### 5. Monitoring & Alerts
Set up CloudWatch alarms for:
- High OTP failure rate (> 20%)
- High SMS costs (> budget)
- Lambda errors (> 1%)
- DynamoDB throttling

## Production Checklist

Before going live:

- [ ] SNS spending limit approved and configured
- [ ] SMS sending tested with real phone numbers
- [ ] API Gateway rate limiting configured
- [ ] CloudWatch alarms set up
- [ ] DynamoDB backup enabled
- [ ] Lambda error handling tested
- [ ] Mobile app tested end-to-end
- [ ] Load testing completed
- [ ] Security review done
- [ ] Monitoring dashboard created
- [ ] On-call rotation established
- [ ] Incident response plan documented

## Support

For issues:
1. Check CloudWatch logs
2. Review this guide
3. Check AWS SNS documentation
4. Contact AWS support for SNS issues

## Next Steps

After successful deployment:
1. Monitor SMS delivery rates
2. Optimize costs (consider alternative SMS providers)
3. Add analytics (login success rate, OTP delivery time)
4. Implement advanced features (biometric auth, social login)
5. Scale infrastructure based on usage
