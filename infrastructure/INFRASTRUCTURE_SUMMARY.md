# Infrastructure Summary - Farmer Decision Support Platform

## Overview

This document provides a comprehensive summary of the infrastructure setup for the Farmer Decision Support Platform, including all AWS resources, configurations, and deployment procedures.

## Infrastructure Components

### 1. Compute Layer

**AWS Lambda Functions** (6 functions):
- `farmer-platform-auth-production`: Authentication and OTP management
- `farmer-platform-recommendations-production`: AI-powered crop/fertilizer/seed recommendations
- `farmer-platform-schemes-production`: Government schemes navigator
- `farmer-platform-market-prices-production`: Market price intelligence
- `farmer-platform-alerts-production`: Alert and reminder system
- `farmer-platform-training-production`: Training content delivery

**Configuration**:
- Runtime: Node.js 22.x
- Memory: 512 MB (1024 MB for recommendations)
- Timeout: 30 seconds (60 seconds for recommendations)
- VPC: Deployed in private subnets
- X-Ray: Enabled for distributed tracing

### 2. API Layer

**API Gateway REST API**:
- Type: Regional
- Endpoints: `/auth`, `/recommendations`, `/schemes`, `/market-prices`, `/alerts`, `/training`
- Authentication: API Key
- Throttling: 1000 requests/second, 2000 burst
- Logging: CloudWatch access logs
- Tracing: X-Ray enabled

### 3. Database Layer

**DynamoDB Tables** (6 tables with global replication):

1. **Users Table**
   - Hash Key: `userId`
   - GSI: `MobileNumberIndex` on `mobileNumber`
   - Features: Streams, Point-in-time recovery

2. **Crop Plans Table**
   - Hash Key: `planId`
   - GSI: `UserIdIndex` on `userId` + `status`
   - Features: Streams, Point-in-time recovery

3. **Schemes Table**
   - Hash Key: `schemeId`
   - GSI: `StateIndex` on `state`
   - Features: Streams, Point-in-time recovery

4. **Market Prices Table**
   - Hash Key: `priceId`
   - GSI: `CropDateIndex` on `cropName` + `date`
   - Features: Streams, Point-in-time recovery, TTL

5. **Alerts Table**
   - Hash Key: `alertId`
   - GSI: `UserScheduledIndex` on `userId` + `scheduledTime`
   - Features: Streams, Point-in-time recovery, TTL

6. **Training Lessons Table**
   - Hash Key: `lessonId`
   - GSI: `CategoryIndex` on `category`
   - Features: Streams, Point-in-time recovery

**Billing**: Pay-per-request (on-demand)

### 4. Storage Layer

**S3 Buckets**:

1. **Content Bucket** (`farmer-platform-content-production`)
   - Purpose: Training videos, images, documents
   - Features: Versioning, encryption (AES-256), lifecycle policies
   - Lifecycle: Transition to Glacier after 90 days
   - Access: CloudFront OAI only

2. **Backup Bucket** (`farmer-platform-backup-production`)
   - Purpose: Database backups, snapshots
   - Features: Versioning, encryption
   - Lifecycle: Expire after 30 days

3. **Content Backup Region** (`farmer-platform-content-production-backup`)
   - Purpose: Cross-region replication target
   - Region: ap-southeast-1 (Singapore)
   - Features: Versioning, encryption

### 5. CDN Layer

**CloudFront Distribution**:
- Origin: S3 content bucket
- Price Class: PriceClass_200 (Asia, Europe, North America)
- Caching: Optimized for videos and images
- Compression: Enabled
- HTTPS: Required (redirect HTTP to HTTPS)
- Access: Origin Access Identity (OAI)

### 6. Networking Layer

**VPC Configuration**:
- CIDR: 10.0.0.0/16
- Availability Zones: 2 (a, b)
- Private Subnets: 10.0.1.0/24, 10.0.2.0/24
- Public Subnets: 10.0.10.0/24, 10.0.11.0/24
- Internet Gateway: Enabled
- VPC Endpoints: DynamoDB, S3

**Security Groups**:
- Lambda SG: Egress only
- VPC Endpoints SG: HTTPS ingress from VPC

### 7. IAM Layer

**Roles**:
1. **Lambda Execution Role**
   - Permissions: DynamoDB, S3, CloudWatch, X-Ray, Bedrock, SNS
   - Attached Policies: AWSLambdaVPCAccessExecutionRole

2. **API Gateway CloudWatch Role**
   - Permissions: CloudWatch Logs
   - Attached Policies: AmazonAPIGatewayPushToCloudWatchLogs

3. **S3 Replication Role**
   - Permissions: S3 replication across regions

### 8. Monitoring Layer

**CloudWatch Dashboard**:
- Lambda metrics: Invocations, errors, duration, throttles
- API Gateway metrics: Requests, errors, latency
- DynamoDB metrics: Capacity, errors
- S3 metrics: Storage, objects
- Custom metrics: Error count, recommendation latency

**CloudWatch Alarms** (10 alarms):
1. Lambda errors > 10 in 5 minutes
2. Lambda duration > 3 seconds
3. Lambda throttles > 5
4. API Gateway 5XX errors > 10
5. API Gateway latency > 3 seconds
6. DynamoDB read throttle
7. DynamoDB write throttle
8. DynamoDB system errors
9. CloudFront error rate > 5%
10. Composite system health alarm

**X-Ray Tracing**:
- Sampling rate: 5%
- Reservoir size: 1 request/second
- Enabled for: Lambda, API Gateway

**CloudWatch Logs**:
- Retention: 30 days
- Log Groups: 7 (6 Lambda + 1 API Gateway)
- Metric Filters: Error count, recommendation latency

### 9. Notification Layer

**SNS Topics**:
1. **Alerts Topic** (`farmer-platform-alerts-production`)
   - Purpose: User notifications (SMS, push)
   - Subscribers: Mobile app endpoints

2. **CloudWatch Alarms Topic** (`farmer-platform-cloudwatch-alarms-production`)
   - Purpose: Infrastructure alerts
   - Subscribers: DevOps team email

### 10. Multi-Region Setup

**Primary Region**: ap-south-1 (Mumbai)
- All services deployed
- Lowest latency for Indian users

**Backup Region**: ap-southeast-1 (Singapore)
- DynamoDB global tables (automatic replication)
- S3 cross-region replication
- Disaster recovery target

**Failover**:
- Route53 health checks on primary API
- Automatic DNS failover on failure
- RTO: 1 hour, RPO: 5 minutes

## Deployment Architecture

### CI/CD Pipeline

**GitHub Actions Workflow**:

1. **Build and Test**
   - Checkout code
   - Install dependencies
   - Run linter
   - Run unit tests
   - Generate coverage reports
   - Build Lambda functions
   - Upload artifacts

2. **Security Scan**
   - Dependency vulnerability scan
   - Snyk security scan

3. **Deploy to Staging** (on push to `develop`)
   - Configure AWS credentials
   - Download artifacts
   - Terraform init/plan/apply
   - Run E2E tests

4. **Deploy to Production** (on push to `main`)
   - Configure AWS credentials
   - Download artifacts
   - Terraform init/plan/apply
   - Blue-green deployment:
     - Create new version
     - Canary (10% traffic)
     - Monitor metrics (5 minutes)
     - Gradual shift (50% traffic)
     - Complete (100% traffic)
   - Automatic rollback on errors
   - Slack notification

### Deployment Scripts

1. **build-lambda.sh**: Build Lambda function packages
2. **deploy.sh**: Deploy infrastructure with Terraform
3. **rollback.sh**: Rollback failed deployments
4. **setup-backend.sh**: Initialize Terraform backend

## Security Configuration

### Network Security
- Lambda functions in private subnets
- No direct internet access for Lambda
- VPC endpoints for AWS services
- Security groups with minimal permissions

### Data Security
- S3 encryption at rest (AES-256)
- DynamoDB encryption at rest (AWS managed)
- TLS 1.3 for data in transit
- API Gateway with API keys
- CloudFront HTTPS only

### Access Control
- IAM roles with least privilege
- S3 bucket policies restricting access
- API Gateway throttling
- Lambda execution roles scoped to specific resources

### Compliance
- Data residency: India (ap-south-1)
- Backup region: Singapore (ap-southeast-1)
- Point-in-time recovery enabled
- Audit logging via CloudWatch

## Performance Specifications

### Targets (from Requirements 17.3)
- **Concurrent Users**: 10 million
- **Response Time**: < 3 seconds under normal load
- **Uptime**: 99.9%
- **Throughput**: 1000 requests/second per region

### Optimizations
- Lambda provisioned concurrency for critical functions
- DynamoDB on-demand scaling
- CloudFront edge caching
- API Gateway caching
- VPC endpoints to reduce latency

## Cost Optimization

### Strategies
1. **DynamoDB**: On-demand billing (pay for actual usage)
2. **Lambda**: Right-sized memory allocation
3. **S3**: Lifecycle policies (Glacier after 90 days)
4. **CloudFront**: Optimized price class
5. **VPC Endpoints**: Reduce data transfer costs
6. **CloudWatch**: 30-day log retention

### Estimated Costs (10M users)
- Lambda: $500-1000/month
- DynamoDB: $300-600/month
- S3: $100-200/month
- CloudFront: $200-400/month
- API Gateway: $150-300/month
- Data Transfer: $100-200/month
- CloudWatch: $50-100/month
- **Total**: ~$1,400-2,800/month

## Disaster Recovery

### Backup Strategy
- DynamoDB continuous backups
- S3 versioning enabled
- Cross-region replication
- Daily snapshots to backup bucket

### Recovery Procedures
1. **Database Recovery**: Point-in-time restore
2. **Content Recovery**: S3 versioning or cross-region copy
3. **Infrastructure Recovery**: Terraform state restore
4. **Region Failover**: Route53 automatic failover

### Testing
- Monthly disaster recovery drills
- Automated backup verification
- Failover testing in staging

## Monitoring and Alerting

### Key Metrics
- Lambda invocations, errors, duration
- API Gateway requests, errors, latency
- DynamoDB capacity, throttles, errors
- S3 storage, requests
- CloudFront error rates, cache hit ratio

### Alert Channels
- Email (SNS)
- Slack (optional)
- PagerDuty (optional)

### On-Call Procedures
1. Receive alert via SNS
2. Check CloudWatch dashboard
3. Review X-Ray traces
4. Check CloudWatch logs
5. Escalate if needed
6. Document incident

## Maintenance Procedures

### Regular Tasks
- **Daily**: Check dashboard, review errors
- **Weekly**: Review alarms, check capacity
- **Monthly**: Update dependencies, test DR, review costs

### Update Procedures
1. **Lambda Updates**: Build → Test → Deploy via CI/CD
2. **Infrastructure Updates**: Terraform plan → Review → Apply
3. **Security Updates**: Immediate deployment via CI/CD

### Scaling Procedures
- Lambda: Automatic (AWS managed)
- DynamoDB: Automatic (on-demand)
- API Gateway: Automatic (AWS managed)
- Manual: Increase Lambda memory/timeout if needed

## Troubleshooting

### Common Issues

1. **Lambda Timeout**
   - Check CloudWatch logs
   - Review X-Ray traces
   - Increase timeout or optimize code

2. **DynamoDB Throttling**
   - Check CloudWatch metrics
   - Review query patterns
   - Consider GSI optimization

3. **API Gateway 5XX Errors**
   - Check Lambda errors
   - Review CloudWatch logs
   - Verify IAM permissions

4. **CloudFront 403 Errors**
   - Verify S3 bucket policy
   - Check OAI configuration
   - Invalidate cache

### Support Resources
- CloudWatch Logs
- X-Ray Traces
- AWS Support
- Internal documentation
- DevOps team

## Future Enhancements

### Phase 1 (Months 1-3)
- Basic infrastructure (current)
- Core Lambda functions
- Single region deployment

### Phase 2 (Months 4-6)
- Multi-region active-active
- ElastiCache for caching
- Advanced monitoring (Grafana)
- Auto-scaling optimization

### Phase 3 (Months 7-12)
- Kubernetes for long-running processes
- Real-time data processing (Kinesis)
- GraphQL API
- Advanced ML pipelines

## Documentation

### Available Documents
1. **README.md**: Infrastructure overview
2. **DEPLOYMENT_GUIDE.md**: Step-by-step deployment
3. **INFRASTRUCTURE_SUMMARY.md**: This document
4. **Terraform files**: Infrastructure as code
5. **CI/CD workflow**: `.github/workflows/backend-ci-cd.yml` | `.github/workflows/mobile-ci-cd.yml`

### Additional Resources
- AWS Documentation
- Terraform AWS Provider docs
- Internal wiki
- Runbooks

## Conclusion

The infrastructure is designed for:
- **Scalability**: Handle 10M concurrent users
- **Reliability**: 99.9% uptime with multi-region
- **Performance**: < 3 second response time
- **Security**: Encryption, IAM, network isolation
- **Cost-efficiency**: Serverless, on-demand billing
- **Maintainability**: IaC, CI/CD, monitoring

All requirements from the design document (Requirements 17.3, 20.6, 20.7) are met.
