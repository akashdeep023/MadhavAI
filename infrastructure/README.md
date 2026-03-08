# Farmer Decision Support Platform - Infrastructure

This directory contains the infrastructure as code (IaC) and deployment configurations for the Farmer Decision Support Platform.

## Architecture Overview

The platform uses a serverless architecture on AWS with the following components:

- **Compute**: AWS Lambda functions (Node.js 22.x)
- **API**: API Gateway REST API
- **Database**: DynamoDB with global tables
- **Storage**: S3 with CloudFront CDN
- **Networking**: VPC with public/private subnets
- **Monitoring**: CloudWatch, X-Ray
- **Notifications**: SNS

## Directory Structure

```
infrastructure/
├── terraform/                  # Terraform configuration files
│   ├── main.tf                # Main configuration and providers
│   ├── variables.tf           # Input variables
│   ├── outputs.tf             # Output values
│   ├── vpc.tf                 # VPC and networking
│   ├── iam.tf                 # IAM roles and policies
│   ├── dynamodb.tf            # DynamoDB tables
│   ├── s3.tf                  # S3 buckets
│   ├── cloudfront.tf          # CloudFront distribution
│   ├── lambda.tf              # Lambda functions
│   ├── api-gateway.tf         # API Gateway configuration
│   ├── sns.tf                 # SNS topics
│   ├── monitoring.tf          # CloudWatch monitoring
│   ├── multi-region.tf        # Multi-region setup
│   └── disaster-recovery.tf   # DR and backup configuration
├── lambda/                     # Lambda function source code
│   ├── failover-handler/      # Automated failover function
│   └── dr-test/               # DR testing function
├── scripts/                    # Deployment scripts
│   ├── build-lambda.sh        # Build Lambda functions
│   ├── build-dr-lambdas.sh    # Build DR Lambda functions
│   ├── deploy.sh              # Deploy infrastructure
│   └── rollback.sh            # Rollback deployment
└── docs/                       # Documentation
    ├── DISASTER_RECOVERY_PROCEDURES.md  # Complete DR procedures
    ├── DR_QUICK_REFERENCE.md            # Quick reference guide
    └── DR_TESTING_SCHEDULE.md           # Testing schedule
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.0
3. **AWS CLI** configured with credentials
4. **Node.js** >= 22.x
5. **npm** or **yarn**

## Setup

### 1. Configure AWS Credentials

```bash
aws configure
```

### 2. Create S3 Backend Bucket

```bash
aws s3 mb s3://farmer-platform-terraform-state --region ap-south-1
aws s3api put-bucket-versioning \
  --bucket farmer-platform-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### 3. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 4. Configure Variables

Create a `terraform.tfvars` file:

```hcl
environment       = "production"
primary_region    = "ap-south-1"
backup_region     = "ap-southeast-1"
project_name      = "farmer-platform"
alert_email       = "alerts@example.com"
enable_xray       = true
```

## Deployment

### Manual Deployment

```bash
# Build Lambda functions
./infrastructure/scripts/build-lambda.sh

# Deploy infrastructure
./infrastructure/scripts/deploy.sh production ap-south-1
```

### CI/CD Deployment

The platform uses GitHub Actions for automated deployments:

- **Push to `develop`**: Deploys to staging
- **Push to `main`**: Deploys to production with blue-green deployment

See `.github/workflows/ci-cd.yml` for details.

## Multi-Region Setup

The platform is deployed in two AWS regions:

- **Primary**: ap-south-1 (Mumbai) - Lowest latency for Indian users
- **Backup**: ap-southeast-1 (Singapore) - Disaster recovery

### Features:

1. **DynamoDB Global Tables**: Automatic replication across regions
2. **S3 Cross-Region Replication**: Content replicated to backup region
3. **Route53 Health Checks**: Automatic failover on primary region failure

## Monitoring and Alerting

### CloudWatch Dashboard

Access the dashboard at: AWS Console → CloudWatch → Dashboards → `farmer-platform-dashboard-production`

**Metrics tracked:**
- Lambda invocations, errors, duration, throttles
- API Gateway requests, errors, latency
- DynamoDB read/write capacity, errors
- S3 storage metrics
- CloudFront error rates

### Alarms

Alarms are configured for:
- Lambda error rate > 10 errors in 5 minutes
- Lambda duration > 3 seconds
- API Gateway 5XX errors > 10 in 5 minutes
- API Gateway latency > 3 seconds
- DynamoDB throttling
- CloudFront error rate > 5%

Alerts are sent to the configured email via SNS.

### X-Ray Tracing

X-Ray is enabled for distributed tracing. View traces at: AWS Console → X-Ray → Traces

## Blue-Green Deployment

Production deployments use blue-green strategy:

1. **Create new version**: Deploy new Lambda versions
2. **Canary (10%)**: Route 10% traffic to new version
3. **Monitor**: Check error rates for 5 minutes
4. **Gradual shift (50%)**: Route 50% traffic
5. **Complete (100%)**: Route all traffic to new version
6. **Rollback**: Automatic rollback on errors

## Rollback

To rollback a failed deployment:

```bash
./infrastructure/scripts/rollback.sh production ap-south-1
```

This will:
1. List available Terraform state versions
2. Restore previous state
3. Apply previous configuration
4. Verify health

## Cost Optimization

The infrastructure uses several cost optimization strategies:

1. **DynamoDB**: On-demand billing mode
2. **Lambda**: Right-sized memory allocation
3. **S3**: Lifecycle policies to move old data to Glacier
4. **CloudFront**: Price class optimized for Asia
5. **VPC Endpoints**: Reduce data transfer costs

## Security

### Network Security
- Private subnets for Lambda functions
- Security groups with minimal permissions
- VPC endpoints for AWS services

### Data Security
- S3 encryption at rest (AES-256)
- DynamoDB encryption at rest
- TLS 1.3 for data in transit
- IAM roles with least privilege

### Access Control
- API Gateway with API keys
- Lambda execution roles with minimal permissions
- S3 bucket policies restricting access

## Disaster Recovery

**RTO (Recovery Time Objective)**: 1 hour  
**RPO (Recovery Point Objective)**: 5 minutes

### Documentation

- **[Disaster Recovery Procedures](docs/DISASTER_RECOVERY_PROCEDURES.md)**: Complete DR procedures and runbooks
- **[DR Quick Reference](docs/DR_QUICK_REFERENCE.md)**: Quick reference guide for emergencies
- **[DR Testing Schedule](docs/DR_TESTING_SCHEDULE.md)**: Testing schedule and procedures

### Backup Strategy

1. **DynamoDB Backups**
   - Point-in-time recovery enabled (5-minute RPO)
   - Automated daily backups (2:00 AM UTC)
   - Weekly backups retained for 90 days
   - Cross-region backup replication

2. **S3 Backups**
   - Versioning enabled on all buckets
   - Cross-region replication to backup region
   - Daily automated backups
   - 30-day retention for daily backups

3. **Infrastructure Backups**
   - Terraform state versioned in S3
   - Configuration stored in version control
   - Lambda deployment packages archived

### Automated Failover

The platform includes automated failover capabilities:

1. **Health Monitoring**: Route53 health checks every 30 seconds
2. **Failure Detection**: 3 consecutive failures trigger alarm (90 seconds)
3. **Automated Response**: CloudWatch alarm invokes failover Lambda
4. **Verification**: Lambda verifies primary down and backup healthy
5. **DNS Update**: Route53 records updated to backup region
6. **Notification**: SNS alerts sent to operations team
7. **Expected Duration**: ~15 minutes total

### Manual Failover

For planned maintenance or if automated failover fails:

```bash
# Quick failover (5 minutes)
cd infrastructure/terraform

# 1. Verify backup region
aws dynamodb describe-table \
  --table-name farmer-platform-users-production \
  --region ap-southeast-1

# 2. Update DNS to backup region
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://failover-dns.json

# 3. Verify
curl https://api.farmer-platform.com/health

# 4. Notify team
aws sns publish \
  --topic-arn <SNS_ARN> \
  --subject "Manual Failover Executed" \
  --message "Failover to backup region completed"
```

See [DR Procedures](docs/DISASTER_RECOVERY_PROCEDURES.md) for detailed steps.

### DR Testing

- **Automated Tests**: Monthly on 1st at 10:00 AM UTC
- **Failover Drills**: Quarterly (last Saturday of quarter)
- **Full Simulation**: Annually in November

Test results are sent via SNS and logged in CloudWatch.

### Recovery Procedures

**Point-in-Time Recovery** (for data corruption):

```bash
# Restore DynamoDB table to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name farmer-platform-users-production \
  --target-table-name farmer-platform-users-production-restored \
  --restore-date-time "2024-01-15T10:30:00Z" \
  --region ap-south-1
```

**Backup Restoration**:

```bash
# List available backups
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name farmer-platform-dynamodb-backup-vault \
  --region ap-south-1

# Restore from backup
aws backup start-restore-job \
  --recovery-point-arn <ARN> \
  --metadata '{"TableName":"farmer-platform-users-production-restored"}' \
  --iam-role-arn <ROLE_ARN> \
  --region ap-south-1
```

## Troubleshooting

### Lambda Errors

```bash
# View recent errors
aws logs tail /aws/lambda/farmer-platform-auth-production --follow

# View specific error
aws logs filter-log-events \
  --log-group-name /aws/lambda/farmer-platform-auth-production \
  --filter-pattern "ERROR"
```

### API Gateway Issues

```bash
# Check API Gateway logs
aws logs tail /aws/apigateway/farmer-platform-production --follow
```

### DynamoDB Throttling

```bash
# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ReadThrottleEvents \
  --dimensions Name=TableName,Value=farmer-platform-users-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Maintenance

### Update Lambda Functions

```bash
# Build new version
./infrastructure/scripts/build-lambda.sh

# Deploy with Terraform
cd infrastructure/terraform
terraform apply -var="environment=production"
```

### Update Infrastructure

```bash
# Make changes to Terraform files
cd infrastructure/terraform

# Plan changes
terraform plan -var="environment=production"

# Apply changes
terraform apply -var="environment=production"
```

### Rotate Secrets

```bash
# Update API key
aws apigateway update-api-key \
  --api-key <key-id> \
  --patch-operations op=replace,path=/name,value=new-key-name
```

## Support

For issues or questions:
- Check CloudWatch logs and metrics
- Review X-Ray traces for performance issues
- Check SNS notifications for alerts
- Contact DevOps team

## Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Global Tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html)
