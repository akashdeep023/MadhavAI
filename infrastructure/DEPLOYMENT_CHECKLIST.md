# Backend Deployment Checklist

## ✅ What's Already Set Up

### 1. Infrastructure Code
- ✅ Terraform configurations (14 .tf files)
- ✅ VPC, subnets, security groups
- ✅ DynamoDB tables
- ✅ S3 buckets
- ✅ API Gateway
- ✅ CloudFront CDN
- ✅ IAM roles and policies
- ✅ CloudWatch monitoring
- ✅ SNS alerts
- ✅ Disaster recovery setup

### 2. Scripts
- ✅ `build-lambda.sh` - Build Lambda functions (FIXED)
- ✅ `deploy.sh` - Deploy infrastructure
- ✅ `setup-backend.sh` - Setup Terraform backend
- ✅ `rollback.sh` - Rollback deployment
- ✅ `build-dr-lambdas.sh` - Build DR Lambda functions

### 3. CI/CD
- ✅ GitHub Actions workflow (`backend-ci-cd.yml`)
- ✅ Build and test jobs
- ✅ Security scanning
- ✅ Staging deployment
- ✅ Production deployment with canary
- ✅ Rollback on failure

### 4. Documentation
- ✅ Deployment guide
- ✅ Infrastructure summary
- ✅ Disaster recovery procedures
- ✅ DR testing schedule

## ❌ What's Missing - CRITICAL

### 1. Lambda Function Source Code

**Terraform expects 6 Lambda functions:**
1. `auth.zip` - Authentication
2. `recommendations.zip` - Recommendation engine
3. `schemes.zip` - Government schemes
4. `market-prices.zip` - Market price data
5. `alerts.zip` - Alert notifications
6. `training.zip` - Training content

**Currently only have 2:**
- `dr-test` - Disaster recovery testing
- `failover-handler` - Automated failover

**Action Required:** Create the missing 4 Lambda function directories:
```bash
mkdir -p infrastructure/lambda/auth
mkdir -p infrastructure/lambda/recommendations
mkdir -p infrastructure/lambda/schemes
mkdir -p infrastructure/lambda/market-prices
mkdir -p infrastructure/lambda/alerts
mkdir -p infrastructure/lambda/training
```

Each needs:
- `index.js` - Handler function
- `package.json` - Dependencies

### 2. Lambda Function Templates

**Minimal structure for each Lambda:**

```javascript
// index.js
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Function name Lambda',
      timestamp: new Date().toISOString()
    })
  };
};
```

```json
// package.json
{
  "name": "function-name",
  "version": "1.0.0",
  "description": "Function description",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  }
}
```

## ⚠️ Configuration Required

### 1. GitHub Secrets (Backend)

Add these secrets in GitHub → Settings → Secrets and variables → Actions:

**Required:**
- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `ALERT_EMAIL` - Email for infrastructure alerts

**Optional:**
- `SNYK_TOKEN` - For security scanning
- `STAGING_API_URL` - Staging API endpoint (after first deploy)
- `SLACK_WEBHOOK` - Slack notifications

### 2. Terraform Backend Setup

**Before first deployment, run:**
```bash
# Setup S3 bucket and DynamoDB table for Terraform state
./infrastructure/scripts/setup-backend.sh
```

This creates:
- S3 bucket: `farmer-platform-terraform-state`
- DynamoDB table: `terraform-state-lock`

### 3. Terraform Variables

**Required variables (set in workflow or terraform.tfvars):**
- `alert_email` - Email for CloudWatch alerts

**Optional (have defaults):**
- `environment` - Default: "production"
- `primary_region` - Default: "ap-south-1"
- `backup_region` - Default: "ap-southeast-1"
- `project_name` - Default: "farmer-platform"

## 📋 Deployment Steps

### First-Time Setup

1. **Create missing Lambda functions:**
   ```bash
   # Create directories and basic files
   for func in auth recommendations schemes market-prices alerts training; do
     mkdir -p infrastructure/lambda/$func
     # Add index.js and package.json (see templates above)
   done
   ```

2. **Setup Terraform backend:**
   ```bash
   chmod +x infrastructure/scripts/setup-backend.sh
   ./infrastructure/scripts/setup-backend.sh
   ```

3. **Configure GitHub Secrets:**
   - Add AWS credentials
   - Add alert email
   - Add other optional secrets

4. **Test Lambda build locally:**
   ```bash
   npm run build:lambda
   # Should create dist/lambda/*.zip files
   ```

5. **Deploy to staging:**
   ```bash
   chmod +x infrastructure/scripts/deploy.sh
   ./infrastructure/scripts/deploy.sh staging ap-south-1
   ```

6. **Get API URL from Terraform output:**
   ```bash
   cd infrastructure/terraform
   terraform output api_gateway_url
   # Add this to GitHub Secrets as STAGING_API_URL
   ```

### Subsequent Deployments

**Via GitHub Actions:**
- Push to `develop` branch → Deploys to staging
- Push to `main` branch → Deploys to production with canary

**Manual deployment:**
```bash
./infrastructure/scripts/deploy.sh production ap-south-1
```

## 🔍 Verification

### After Deployment

1. **Check Terraform outputs:**
   ```bash
   cd infrastructure/terraform
   terraform output
   ```

2. **Test API health endpoint:**
   ```bash
   curl https://your-api-url/health
   ```

3. **Check Lambda functions:**
   ```bash
   aws lambda list-functions --region ap-south-1 | grep farmer-platform
   ```

4. **Check CloudWatch logs:**
   ```bash
   aws logs tail /aws/lambda/farmer-platform-auth-production --follow
   ```

## 🚨 Common Issues

### Issue 1: "Missing script: build:lambda"
**Status:** ✅ FIXED
- Added script to package.json
- Fixed build-lambda.sh to look in correct directory

### Issue 2: Lambda functions not found
**Status:** ❌ NEEDS FIX
- Create missing Lambda function directories
- Add index.js and package.json to each

### Issue 3: Terraform state bucket doesn't exist
**Solution:** Run `./infrastructure/scripts/setup-backend.sh`

### Issue 4: AWS credentials not configured
**Solution:** Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to GitHub Secrets

### Issue 5: API URL not available for E2E tests
**Solution:** 
1. Deploy infrastructure first
2. Get API URL from Terraform output
3. Add to GitHub Secrets as STAGING_API_URL

## 📝 Next Steps

1. **Immediate (Required for deployment):**
   - [ ] Create 6 missing Lambda function directories
   - [ ] Add basic handler code to each Lambda
   - [ ] Test Lambda build locally

2. **Before first deployment:**
   - [ ] Run setup-backend.sh
   - [ ] Configure GitHub Secrets
   - [ ] Review Terraform variables

3. **After first deployment:**
   - [ ] Save API URLs to GitHub Secrets
   - [ ] Test all endpoints
   - [ ] Setup monitoring alerts

4. **Future improvements:**
   - [ ] Implement actual Lambda business logic
   - [ ] Add integration tests
   - [ ] Setup custom domain
   - [ ] Configure WAF rules
