# 🚀 Quick Start - Deploy Now

## What Was Fixed

✅ **4 deployment errors** blocking your GitHub Actions workflow

## Push and Deploy

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix deployment: Terraform config + Lambda rollback"

# Push to trigger deployment
git push origin main
```

## What Happens Next

### GitHub Actions Workflow (15-20 minutes)

```
1. ✅ Build and Test
   - Install dependencies
   - Run linter
   - Run unit tests
   - Build Lambda functions

2. ✅ Security Scan
   - Dependency vulnerabilities
   - Snyk security scan

3. ✅ Deploy Infrastructure
   - Setup Terraform backend (S3 + DynamoDB)
   - Terraform init
   - Terraform plan
   - Terraform apply

4. ✅ Deploy Lambda Functions
   - Check if aliases exist
   - Create aliases (first deployment)
   - OR canary deployment (subsequent)

5. ✅ Verify Deployment
   - Get API Gateway URL
   - Verify DynamoDB tables
   - Health checks
```

## Expected Output

### First Deployment
```
✅ Terraform creates 6 DynamoDB tables
✅ Terraform creates 6 Lambda functions
✅ Workflow creates "live" alias for each function
✅ API Gateway URL: https://abc123.execute-api.ap-south-1.amazonaws.com/production
✅ Deployment complete!
```

### Subsequent Deployments
```
✅ Terraform updates infrastructure
✅ Canary deployment: 10% traffic to new version
✅ Monitor metrics (5 min)
✅ Shift to 50% traffic
✅ Monitor metrics (5 min)
✅ Complete: 100% traffic to new version
✅ Deployment complete!
```

## Verify Deployment

### 1. Check GitHub Actions
- Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
- Latest workflow should show ✅ green checkmark

### 2. Get API Gateway URL
- From workflow output, copy the API Gateway URL
- Example: `https://abc123.execute-api.ap-south-1.amazonaws.com/production`

### 3. Test Authentication Endpoint

```bash
# Replace YOUR_API_URL with actual URL from workflow
curl -X POST https://YOUR_API_URL/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "+919876543210"}'

# Expected response:
# {"success": true, "message": "OTP sent successfully"}
```

### 4. Check Lambda Functions

```bash
# List all Lambda functions
aws lambda list-functions \
  --region ap-south-1 \
  --query 'Functions[?starts_with(FunctionName, `farmer-platform`)].FunctionName'

# Check alias for auth function
aws lambda get-alias \
  --function-name farmer-platform-auth-production \
  --name live \
  --region ap-south-1
```

### 5. Check DynamoDB Tables

```bash
# List all tables
aws dynamodb list-tables --region ap-south-1

# Describe users table
aws dynamodb describe-table \
  --table-name farmer-platform-users-production \
  --region ap-south-1
```

## Troubleshooting

### Workflow Fails at Terraform Apply
- Check AWS credentials in GitHub Secrets
- Verify `ALERT_EMAIL` secret is set
- Check CloudWatch logs for specific errors

### Workflow Fails at Lambda Deployment
- Ensure Lambda functions built successfully
- Check IAM permissions
- Verify function names match pattern

### API Gateway URL Not Available
- Wait for Terraform to complete
- Check Terraform outputs in workflow logs
- Verify API Gateway was created

### Can't Test Endpoints
- Ensure API Gateway URL is correct
- Check Lambda function logs in CloudWatch
- Verify DynamoDB tables exist

## What You Get

### Infrastructure
- 6 DynamoDB tables with indexes and TTL
- 6 Lambda functions with "live" aliases
- API Gateway with health check endpoint
- S3 buckets with cross-region replication
- CloudWatch logs and monitoring
- Route53 health checks

### Features
- Zero-downtime deployments
- Automatic canary deployment
- Error monitoring and rollback
- Point-in-time recovery for DynamoDB
- Cross-region S3 replication

### Monitoring
- CloudWatch logs for all functions
- Error rate monitoring
- Health check alarms
- Deployment status notifications

## Next Steps After Deployment

1. **Test All Endpoints**
   - `/auth/send-otp`
   - `/auth/verify-otp`
   - `/auth/refresh-token`
   - `/auth/logout`

2. **Set Up Monitoring Dashboard**
   - CloudWatch dashboard
   - Error rate graphs
   - Request count metrics

3. **Configure Alerts**
   - SNS topic for notifications
   - Email/Slack integration
   - Error threshold alarms

4. **Update Mobile App**
   - Add API Gateway URL to `.env`
   - Test authentication flow
   - Deploy mobile app

## Documentation

- **DEPLOYMENT_FIXES_COMPLETE.md** - Comprehensive overview
- **TERRAFORM_DEPLOYMENT_FIX.md** - Terraform fixes details
- **.github/workflows/DEPLOYMENT_ROLLBACK_FIX.md** - Lambda deployment details
- **infrastructure/terraform/TERRAFORM_FIXES.md** - Technical details

## Support

If deployment fails:
1. Check GitHub Actions logs
2. Review error messages
3. Check AWS CloudWatch logs
4. Verify AWS credentials and permissions

---

**Ready?** Run the commands above and watch your infrastructure deploy! 🚀
