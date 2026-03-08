# Deployment Guide - Farmer Decision Support Platform

This guide provides step-by-step instructions for deploying the Farmer Decision Support Platform infrastructure.

## Quick Start

For experienced users:

```bash
# 1. Configure AWS credentials
aws configure

# 2. Create backend resources
./infrastructure/scripts/setup-backend.sh

# 3. Build and deploy
./infrastructure/scripts/deploy.sh production ap-south-1
```

## Detailed Deployment Steps

### Step 1: Prerequisites

Ensure you have the following installed:

```bash
# Check versions
terraform --version  # Should be >= 1.0
aws --version        # Should be >= 2.0
node --version       # Should be >= 20.x
npm --version        # Should be >= 9.x
```

### Step 2: AWS Account Setup

1. **Create AWS Account** (if not already done)
2. **Create IAM User** with the following permissions:
   - AmazonS3FullAccess
   - AmazonDynamoDBFullAccess
   - AWSLambda_FullAccess
   - AmazonAPIGatewayAdministrator
   - CloudFrontFullAccess
   - CloudWatchFullAccess
   - IAMFullAccess
   - AmazonVPCFullAccess

3. **Configure AWS CLI**:
```bash
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: ap-south-1
# - Default output format: json
```

### Step 3: Create Terraform Backend

The Terraform state is stored in S3 with DynamoDB for locking.

```bash
# Create S3 bucket for state
aws s3 mb s3://farmer-platform-terraform-state --region ap-south-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket farmer-platform-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket farmer-platform-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### Step 4: Configure Variables

Create `infrastructure/terraform/terraform.tfvars`:

```hcl
# Environment configuration
environment    = "production"
primary_region = "ap-south-1"
backup_region  = "ap-southeast-1"
project_name   = "farmer-platform"

# Lambda configuration
lambda_runtime     = "nodejs20.x"
lambda_memory_size = 512
lambda_timeout     = 30

# API Gateway configuration
api_throttle_rate  = 1000
api_throttle_burst = 2000

# CloudFront configuration
cloudfront_price_class = "PriceClass_200"

# S3 lifecycle
s3_lifecycle_days = 90

# Monitoring
alert_email = "your-email@example.com"
enable_xray = true
```

### Step 5: Build Lambda Functions

Before deploying, build the Lambda function packages:

```bash
./infrastructure/scripts/build-lambda.sh
```

This will:
- Create deployment packages for each Lambda function
- Install production dependencies
- Create ZIP files in `dist/lambda/`

### Step 6: Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

Expected output:
```
Initializing the backend...
Successfully configured the backend "s3"!
Terraform has been successfully initialized!
```

### Step 7: Plan Deployment

Review the infrastructure changes:

```bash
terraform plan -var-file="terraform.tfvars" -out=tfplan
```

Review the output carefully. You should see resources being created for:
- VPC and networking (subnets, security groups)
- IAM roles and policies
- DynamoDB tables (6 tables)
- S3 buckets (content, backup)
- Lambda functions (6 functions)
- API Gateway
- CloudFront distribution
- CloudWatch alarms and dashboards
- SNS topics

### Step 8: Apply Infrastructure

Deploy the infrastructure:

```bash
terraform apply tfplan
```

This will take approximately 10-15 minutes. The process will:
1. Create VPC and networking resources
2. Set up IAM roles
3. Create DynamoDB tables
4. Create S3 buckets
5. Deploy Lambda functions
6. Configure API Gateway
7. Set up CloudFront distribution
8. Configure monitoring and alerts

### Step 9: Verify Deployment

After deployment completes, verify the infrastructure:

```bash
# Get outputs
terraform output

# Test API endpoint
API_URL=$(terraform output -raw api_gateway_url)
curl -X POST $API_URL/auth \
  -H "Content-Type: application/json" \
  -d '{"action": "health_check"}'

# Check CloudFront
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain)
curl https://$CLOUDFRONT_DOMAIN
```

### Step 10: Configure Multi-Region

The multi-region setup is automatically configured, but verify:

```bash
# Check DynamoDB global tables
aws dynamodb describe-global-table \
  --global-table-name farmer-platform-users-production

# Check S3 replication
aws s3api get-bucket-replication \
  --bucket farmer-platform-content-production
```

### Step 11: Set Up Monitoring

1. **Access CloudWatch Dashboard**:
   - Go to AWS Console → CloudWatch → Dashboards
   - Open `farmer-platform-dashboard-production`

2. **Verify Alarms**:
   - Go to CloudWatch → Alarms
   - Confirm all alarms are in "OK" state

3. **Subscribe to SNS Notifications**:
   - Check your email for SNS subscription confirmation
   - Click the confirmation link

4. **Enable X-Ray**:
   - Go to AWS Console → X-Ray
   - Verify traces are being collected

## CI/CD Setup

### GitHub Actions Configuration

1. **Add GitHub Secrets**:
   - Go to GitHub repository → Settings → Secrets
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `ALERT_EMAIL`
     - `STAGING_API_URL`
     - `SLACK_WEBHOOK` (optional)
     - `SNYK_TOKEN` (optional)

2. **Enable GitHub Actions**:
   - The workflow is in `.github/workflows/ci-cd.yml`
   - Pushes to `develop` deploy to staging
   - Pushes to `main` deploy to production

3. **Test CI/CD**:
```bash
# Create a test branch
git checkout -b test-deployment

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "Test deployment"
git push origin test-deployment

# Create pull request to develop
# Merge to trigger staging deployment
```

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests passing in staging
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Backup strategy verified
- [ ] Monitoring and alerts configured
- [ ] SNS email subscriptions confirmed
- [ ] API keys generated and secured
- [ ] CloudFront distribution tested
- [ ] Multi-region replication verified
- [ ] Disaster recovery plan documented
- [ ] Team notified of deployment

## Post-Deployment Tasks

### 1. Upload Initial Content

```bash
# Upload training videos
aws s3 cp training-videos/ s3://farmer-platform-content-production/videos/ --recursive

# Upload images
aws s3 cp images/ s3://farmer-platform-content-production/images/ --recursive

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

### 2. Seed Database

```bash
# Import schemes data
aws dynamodb batch-write-item \
  --request-items file://data/schemes.json

# Import training lessons
aws dynamodb batch-write-item \
  --request-items file://data/lessons.json
```

### 3. Configure DNS (Optional)

If using a custom domain:

```bash
# Create Route53 hosted zone
aws route53 create-hosted-zone \
  --name api.farmerplatform.com \
  --caller-reference $(date +%s)

# Create A record pointing to API Gateway
# Create CNAME record pointing to CloudFront
```

### 4. Set Up Monitoring Dashboards

1. Import custom CloudWatch dashboards
2. Configure Grafana (if using)
3. Set up PagerDuty integration (if using)

## Troubleshooting

### Terraform Init Fails

**Error**: "Error configuring the backend"

**Solution**:
```bash
# Verify S3 bucket exists
aws s3 ls s3://farmer-platform-terraform-state

# Verify DynamoDB table exists
aws dynamodb describe-table --table-name terraform-state-lock
```

### Lambda Deployment Fails

**Error**: "Error creating Lambda function"

**Solution**:
```bash
# Verify ZIP files exist
ls -lh dist/lambda/

# Rebuild Lambda functions
./infrastructure/scripts/build-lambda.sh

# Check IAM permissions
aws iam get-role --role-name farmer-platform-lambda-execution-role
```

### API Gateway Not Accessible

**Error**: "403 Forbidden"

**Solution**:
```bash
# Check API Gateway deployment
aws apigateway get-deployments \
  --rest-api-id $(terraform output -raw api_gateway_id)

# Verify Lambda permissions
aws lambda get-policy \
  --function-name farmer-platform-auth-production
```

### DynamoDB Throttling

**Error**: "ProvisionedThroughputExceededException"

**Solution**:
- DynamoDB is configured with on-demand billing
- Check CloudWatch metrics for throttling
- Verify global table replication is working

### CloudFront Not Serving Content

**Error**: "403 Access Denied"

**Solution**:
```bash
# Verify S3 bucket policy
aws s3api get-bucket-policy \
  --bucket farmer-platform-content-production

# Check CloudFront OAI
aws cloudfront get-cloud-front-origin-access-identity \
  --id $(terraform output -raw cloudfront_oai_id)

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Rollback Procedure

If deployment fails or issues are detected:

```bash
# Option 1: Automatic rollback (CI/CD)
# The pipeline automatically rolls back on errors

# Option 2: Manual rollback
./infrastructure/scripts/rollback.sh production ap-south-1

# Option 3: Terraform state rollback
cd infrastructure/terraform
terraform state pull > current-state.json
# Restore previous state from S3
aws s3 cp s3://farmer-platform-terraform-state/infrastructure/terraform.tfstate.backup terraform.tfstate
terraform apply -auto-approve
```

## Maintenance

### Regular Tasks

**Daily**:
- Check CloudWatch dashboard
- Review error logs
- Monitor costs

**Weekly**:
- Review CloudWatch alarms
- Check DynamoDB capacity
- Review Lambda performance

**Monthly**:
- Update dependencies
- Review and optimize costs
- Test disaster recovery
- Update documentation

### Updates

**Lambda Function Updates**:
```bash
# Update code
# Rebuild
./infrastructure/scripts/build-lambda.sh
# Deploy
terraform apply
```

**Infrastructure Updates**:
```bash
# Update Terraform files
# Plan changes
terraform plan
# Apply changes
terraform apply
```

## Cost Estimation

Estimated monthly costs for 10 million users:

- **Lambda**: $500-1000 (based on invocations)
- **DynamoDB**: $300-600 (on-demand pricing)
- **S3**: $100-200 (storage and requests)
- **CloudFront**: $200-400 (data transfer)
- **API Gateway**: $150-300 (requests)
- **Data Transfer**: $100-200
- **CloudWatch**: $50-100

**Total**: ~$1,400-2,800/month

Use AWS Cost Explorer for accurate tracking.

## Support

For deployment issues:
- Check CloudWatch logs
- Review Terraform state
- Contact DevOps team
- Refer to AWS documentation

## Next Steps

After successful deployment:
1. Configure mobile app with API endpoint
2. Set up user authentication
3. Import initial data
4. Configure monitoring alerts
5. Train operations team
6. Plan scaling strategy
7. Document runbooks
