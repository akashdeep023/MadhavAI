# OTP Not Coming - Troubleshooting Guide

## Issue Fixed
✅ **Lambda IAM role now has SNS SMS permissions** - I've updated `infrastructure/terraform/iam.tf`

## Complete Verification Steps

### 1. Update GitHub Secrets (CRITICAL)

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions**

Add/Update this secret:
```
Name: API_BASE_URL
Value: https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/production
```

**How to get the correct URL:**
```bash
cd infrastructure/terraform
terraform output api_gateway_url
```

### 2. Deploy Backend with Updated IAM Permissions

```bash
# Push the IAM changes to trigger backend deployment
git add infrastructure/terraform/iam.tf
git commit -m "fix: Add SNS SMS permissions for OTP"
git push origin main
```

Wait for the backend-ci-cd workflow to complete.

### 3. Rebuild Android App with Correct API URL

After backend deployment completes:

```bash
# Trigger Android build workflow
git commit --allow-empty -m "chore: Rebuild app with correct API URL"
git push origin main
```

The workflow will:
- Read `API_BASE_URL` from GitHub Secrets
- Inject it into the Android build
- Create APK/AAB with the correct backend URL

### 4. Verify API Gateway Configuration

Check if your API Gateway has the correct setup:

```bash
# Get API Gateway URL
cd infrastructure/terraform
terraform output api_gateway_url

# Test the endpoint (replace with your actual URL)
curl -X POST https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/production/auth/send-otp \
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

### 5. Check AWS SNS SMS Configuration

#### A. Enable SMS in AWS SNS
1. Go to AWS Console → SNS → Text messaging (SMS)
2. Check if SMS is enabled in your region (ap-south-1)
3. Set spending limit (default is $1/month)

#### B. Verify SMS Sandbox Mode
If your AWS account is in SNS Sandbox mode:
- You can only send SMS to verified phone numbers
- Go to SNS → Text messaging (SMS) → Sandbox destination phone numbers
- Add and verify test phone numbers

#### C. Request Production Access (if needed)
For production use:
1. Go to SNS → Text messaging (SMS) → Request production access
2. Fill out the form explaining your use case
3. Wait for AWS approval (usually 24-48 hours)

### 6. Check Lambda Logs

View Lambda execution logs to see if OTP is being generated:

```bash
# View auth Lambda logs
aws logs tail /aws/lambda/farmer-platform-auth-production --follow --region ap-south-1
```

Look for:
```
OTP sent successfully to 9876543210
[DEV] OTP for 9876543210: 123456  # If SMS fails, OTP is logged here
```

### 7. Test from Mobile App

1. Install the newly built APK
2. Open the app
3. Enter mobile number
4. Click "Send OTP"
5. Check:
   - Network request in app logs
   - SMS on phone
   - Lambda logs in AWS CloudWatch

### 8. Common Issues & Solutions

#### Issue: "Missing Authentication Token"
**Solution:** API Gateway URL is wrong or missing `/production`
```bash
# Correct format:
API_BASE_URL=https://abc123.execute-api.ap-south-1.amazonaws.com/production

# Wrong (missing stage):
API_BASE_URL=https://abc123.execute-api.ap-south-1.amazonaws.com
```

#### Issue: "Network Error" or "Timeout"
**Solution:** 
- Check if API Gateway is deployed
- Verify Lambda is attached to API Gateway
- Check VPC/Security Group settings

#### Issue: OTP Generated but SMS Not Received
**Solution:**
- Check AWS SNS sandbox mode
- Verify phone number format (+91XXXXXXXXXX)
- Check SNS spending limits
- Look for OTP in Lambda logs (it's logged if SMS fails)

#### Issue: "Invalid mobile number"
**Solution:** 
- Must be 10 digits
- Must start with 6, 7, 8, or 9
- Don't include +91 or country code in app

### 9. Environment Variables in Built APK

To verify what API_BASE_URL is baked into your APK:

```bash
# Extract APK
unzip app-release.apk -d extracted/

# Check for .env or config files
grep -r "API_BASE_URL" extracted/
```

Or check in app logs when it starts.

### 10. Quick Test Script

Save this as `test-otp.sh`:

```bash
#!/bin/bash

API_URL="https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/production"
PHONE="9876543210"

echo "Testing OTP API..."
echo "URL: $API_URL/auth/send-otp"
echo "Phone: $PHONE"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\":\"$PHONE\"}")

echo "Response:"
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ OTP API is working!"
  echo "Check your phone for SMS or Lambda logs for OTP"
else
  echo ""
  echo "❌ OTP API failed"
  echo "Check API Gateway and Lambda configuration"
fi
```

Run it:
```bash
chmod +x test-otp.sh
./test-otp.sh
```

## Summary of Changes Made

1. ✅ Added missing API Gateway methods for all endpoints
2. ✅ Added SNS SMS permissions to Lambda IAM role
3. ✅ Updated deployment dependencies

## Next Steps

1. Deploy backend (push iam.tf changes)
2. Get API Gateway URL from Terraform output
3. Update GitHub Secret `API_BASE_URL`
4. Rebuild Android app
5. Test OTP flow

## Still Not Working?

Check these in order:
1. GitHub Secret `API_BASE_URL` is correct
2. Android build workflow completed successfully
3. Fresh APK installed on device (uninstall old version first)
4. AWS SNS is not in sandbox mode OR phone number is verified
5. Lambda has correct IAM permissions (check CloudWatch logs)
6. API Gateway stage is deployed
