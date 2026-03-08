# Disaster Recovery Procedures

## Overview

This document outlines the disaster recovery (DR) procedures for the Farmer Decision Support Platform. The platform is designed with multi-region deployment to ensure high availability and business continuity.

### Recovery Objectives

- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 5 minutes

### Architecture

- **Primary Region**: ap-south-1 (Mumbai, India)
- **Backup Region**: ap-southeast-1 (Singapore)
- **Replication**: DynamoDB Global Tables, S3 Cross-Region Replication
- **Backup Strategy**: Automated daily backups with point-in-time recovery

---

## Table of Contents

1. [Automated Failover](#automated-failover)
2. [Manual Failover Procedures](#manual-failover-procedures)
3. [Recovery Procedures](#recovery-procedures)
4. [Incident Response](#incident-response)
5. [Testing and Drills](#testing-and-drills)
6. [Runbooks](#runbooks)

---

## Automated Failover

The platform includes automated failover capabilities that trigger when the primary region becomes unavailable.

### How It Works

1. **Health Monitoring**: Route53 health checks monitor the primary region API Gateway endpoint every 30 seconds
2. **Failure Detection**: If 3 consecutive health checks fail (90 seconds), CloudWatch alarm triggers
3. **Failover Initiation**: CloudWatch alarm invokes the failover Lambda function
4. **Verification**: Lambda verifies primary is down and backup is healthy
5. **DNS Update**: Route53 records updated to point to backup region
6. **Notification**: SNS notification sent to operations team
7. **Monitoring**: Failover metrics recorded in CloudWatch

### Expected Timeline

| Step | Duration | Cumulative |
|------|----------|------------|
| Health check failure detection | 90 seconds | 1.5 minutes |
| Lambda invocation | 5 seconds | 1.6 minutes |
| Verification checks | 30 seconds | 2.1 minutes |
| DNS update | 60 seconds | 3.1 minutes |
| DNS propagation | 5-10 minutes | 8-13 minutes |
| **Total RTO** | | **~15 minutes** |

### Monitoring Automated Failover

Check CloudWatch dashboard: `farmer-platform-disaster-recovery`

Key metrics:
- `FailoverDuration`: Time taken for failover
- `FailoverAttempts`: Number of failover attempts
- `HealthCheckStatus`: Primary region health

---

## Manual Failover Procedures

Use manual failover when:
- Automated failover fails
- Planned maintenance requires region switch
- Testing DR procedures

### Prerequisites

- AWS CLI configured with appropriate credentials
- Access to both primary and backup regions
- SNS topic ARN for notifications

### Step-by-Step Manual Failover

#### Step 1: Assess the Situation (5 minutes)

```bash
# Check primary region health
aws cloudwatch get-metric-statistics \
  --namespace AWS/Route53 \
  --metric-name HealthCheckStatus \
  --dimensions Name=HealthCheckId,Value=<HEALTH_CHECK_ID> \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Minimum \
  --region ap-south-1

# Check DynamoDB table status in primary region
aws dynamodb describe-table \
  --table-name farmer-platform-users-production \
  --region ap-south-1

# Check API Gateway in primary region
curl -I https://api.farmer-platform.com/health
```

#### Step 2: Verify Backup Region (5 minutes)

```bash
# Check DynamoDB tables in backup region
aws dynamodb describe-table \
  --table-name farmer-platform-users-production \
  --region ap-southeast-1

# Verify data replication
aws dynamodb describe-global-table \
  --global-table-name farmer-platform-users-production \
  --region ap-south-1

# Check S3 replication status
aws s3api get-bucket-replication \
  --bucket farmer-platform-content-production \
  --region ap-south-1

# Test backup region API
curl -I https://backup-api.farmer-platform.com/health
```

#### Step 3: Update DNS Records (10 minutes)

```bash
# Get current DNS configuration
aws route53 list-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --query "ResourceRecordSets[?Name=='api.farmer-platform.com.']"

# Create change batch JSON
cat > dns-change.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.farmer-platform.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "<BACKUP_API_GATEWAY_ENDPOINT>"
          }
        ]
      }
    }
  ]
}
EOF

# Apply DNS change
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch file://dns-change.json

# Monitor change status
aws route53 get-change --id <CHANGE_ID>
```

#### Step 4: Verify Failover (10 minutes)

```bash
# Wait for DNS propagation
sleep 300

# Test API endpoint
curl https://api.farmer-platform.com/health

# Check which region is responding
curl -I https://api.farmer-platform.com/health | grep x-amzn-RequestId

# Verify user can authenticate
curl -X POST https://api.farmer-platform.com/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "+919876543210"}'

# Check DynamoDB metrics in backup region
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=farmer-platform-users-production \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region ap-southeast-1
```

#### Step 5: Notify Stakeholders (5 minutes)

```bash
# Send SNS notification
aws sns publish \
  --topic-arn <SNS_TOPIC_ARN> \
  --subject "[MANUAL FAILOVER] Farmer Platform - Primary to Backup" \
  --message "Manual failover completed at $(date -u +%Y-%m-%dT%H:%M:%S). 
Primary region: ap-south-1 (DOWN)
Backup region: ap-southeast-1 (ACTIVE)
Performed by: <YOUR_NAME>
Reason: <REASON>
Status: SUCCESS"
```

#### Step 6: Document Incident (Ongoing)

Create incident report with:
- Timestamp of failure detection
- Root cause (if known)
- Actions taken
- Failover duration
- Impact assessment
- Lessons learned

---

## Recovery Procedures

### Recovering from Backup Region to Primary

Once the primary region is restored, follow these steps to fail back:

#### Step 1: Verify Primary Region Health (10 minutes)

```bash
# Check all DynamoDB tables
for table in users crop-plans schemes market-prices alerts training-lessons; do
  echo "Checking $table..."
  aws dynamodb describe-table \
    --table-name farmer-platform-${table}-production \
    --region ap-south-1
done

# Check S3 buckets
aws s3 ls s3://farmer-platform-content-production --region ap-south-1

# Check Lambda functions
aws lambda list-functions --region ap-south-1

# Check API Gateway
aws apigateway get-rest-apis --region ap-south-1
```

#### Step 2: Verify Data Synchronization (15 minutes)

```bash
# Check global table replication lag
aws dynamodb describe-global-table \
  --global-table-name farmer-platform-users-production \
  --region ap-south-1

# Compare item counts between regions
aws dynamodb scan \
  --table-name farmer-platform-users-production \
  --select COUNT \
  --region ap-south-1

aws dynamodb scan \
  --table-name farmer-platform-users-production \
  --select COUNT \
  --region ap-southeast-1

# Check S3 replication metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name ReplicationLatency \
  --dimensions Name=SourceBucket,Value=farmer-platform-content-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region ap-south-1
```

#### Step 3: Gradual Traffic Shift (30 minutes)

```bash
# Update Route53 with weighted routing
cat > weighted-routing.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.farmer-platform.com",
        "Type": "CNAME",
        "SetIdentifier": "Primary-10percent",
        "Weight": 10,
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "<PRIMARY_API_GATEWAY_ENDPOINT>"
          }
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.farmer-platform.com",
        "Type": "CNAME",
        "SetIdentifier": "Backup-90percent",
        "Weight": 90,
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "<BACKUP_API_GATEWAY_ENDPOINT>"
          }
        ]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch file://weighted-routing.json

# Monitor for 10 minutes, then increase primary weight
# Repeat: 10% -> 25% -> 50% -> 75% -> 100%
```

#### Step 4: Complete Failback (10 minutes)

```bash
# Switch 100% traffic to primary
cat > primary-only.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.farmer-platform.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "<PRIMARY_API_GATEWAY_ENDPOINT>"
          }
        ]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch file://primary-only.json

# Verify
curl https://api.farmer-platform.com/health
```

### Point-in-Time Recovery

If data corruption occurs, use DynamoDB point-in-time recovery:

```bash
# Restore table to specific time (within last 35 days)
aws dynamodb restore-table-to-point-in-time \
  --source-table-name farmer-platform-users-production \
  --target-table-name farmer-platform-users-production-restored \
  --restore-date-time "2024-01-15T10:30:00Z" \
  --region ap-south-1

# Wait for restore to complete
aws dynamodb describe-table \
  --table-name farmer-platform-users-production-restored \
  --region ap-south-1 \
  --query 'Table.TableStatus'

# Verify restored data
aws dynamodb scan \
  --table-name farmer-platform-users-production-restored \
  --select COUNT \
  --region ap-south-1
```

### Backup Restoration

Restore from AWS Backup vault:

```bash
# List available recovery points
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name farmer-platform-dynamodb-backup-vault \
  --region ap-south-1

# Start restore job
aws backup start-restore-job \
  --recovery-point-arn <RECOVERY_POINT_ARN> \
  --metadata '{"TableName":"farmer-platform-users-production-restored"}' \
  --iam-role-arn <BACKUP_ROLE_ARN> \
  --region ap-south-1

# Monitor restore job
aws backup describe-restore-job \
  --restore-job-id <RESTORE_JOB_ID> \
  --region ap-south-1
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P1 - Critical | Complete service outage | Immediate | CTO, CEO |
| P2 - High | Partial service degradation | 15 minutes | Engineering Lead |
| P3 - Medium | Minor issues, workaround available | 1 hour | On-call engineer |
| P4 - Low | Cosmetic issues, no impact | 24 hours | Regular sprint |

### Incident Response Team

- **Incident Commander**: Engineering Lead
- **Technical Lead**: Senior Backend Engineer
- **Communications Lead**: Product Manager
- **Support**: DevOps Engineer

### Incident Response Process

1. **Detection** (0-5 minutes)
   - Automated monitoring alerts
   - User reports
   - Health check failures

2. **Assessment** (5-10 minutes)
   - Determine severity
   - Identify affected components
   - Estimate impact

3. **Response** (10-60 minutes)
   - Execute appropriate runbook
   - Implement workarounds
   - Initiate failover if needed

4. **Communication** (Ongoing)
   - Notify stakeholders
   - Update status page
   - Provide regular updates

5. **Resolution** (Variable)
   - Fix root cause
   - Verify service restoration
   - Monitor for stability

6. **Post-Incident** (24-48 hours)
   - Write incident report
   - Conduct blameless postmortem
   - Implement preventive measures

### Communication Templates

#### Initial Notification

```
Subject: [P1 INCIDENT] Farmer Platform Service Disruption

We are currently experiencing service disruption in the primary region (Mumbai).

Status: INVESTIGATING
Impact: Users may experience errors or slow response times
Started: [TIMESTAMP]
Estimated Resolution: [TIMESTAMP]

Our team is actively working on resolution. Updates will be provided every 15 minutes.

Incident Commander: [NAME]
```

#### Resolution Notification

```
Subject: [RESOLVED] Farmer Platform Service Restored

The service disruption has been resolved.

Status: RESOLVED
Resolution: Failover to backup region completed successfully
Resolved: [TIMESTAMP]
Duration: [DURATION]

All services are now operating normally. We will continue to monitor closely.

A detailed incident report will be shared within 48 hours.
```

---

## Testing and Drills

### Monthly DR Tests

Automated DR tests run on the 1st of each month at 10:00 AM UTC.

Tests include:
1. Backup integrity verification
2. S3 replication status
3. DynamoDB global table replication
4. Backup region accessibility
5. RTO/RPO compliance

Results are sent via SNS to the operations team.

### Quarterly Failover Drills

Schedule: Last Saturday of each quarter, 2:00 AM - 6:00 AM IST

#### Drill Procedure

1. **Pre-Drill** (1 week before)
   - Notify all stakeholders
   - Review procedures
   - Prepare monitoring dashboards

2. **Drill Execution** (4 hours)
   - Simulate primary region failure
   - Execute manual failover
   - Verify all services
   - Test failback procedures

3. **Post-Drill** (1 week after)
   - Review drill results
   - Document issues found
   - Update procedures
   - Schedule remediation

#### Drill Checklist

- [ ] Stakeholders notified
- [ ] Monitoring dashboards prepared
- [ ] Backup region verified healthy
- [ ] Failover executed successfully
- [ ] All services verified operational
- [ ] Failback completed
- [ ] Drill report created
- [ ] Lessons learned documented
- [ ] Procedures updated

---

## Runbooks

### Runbook 1: Complete Primary Region Failure

**Scenario**: Primary region (Mumbai) is completely unavailable

**Symptoms**:
- Health checks failing
- API returning 5xx errors
- Users unable to access platform

**Steps**:
1. Verify automated failover triggered (check CloudWatch logs)
2. If automated failover failed, execute manual failover
3. Verify backup region serving traffic
4. Monitor error rates and latency
5. Communicate with stakeholders
6. Investigate primary region issues
7. Plan failback when primary restored

**Expected Duration**: 15-30 minutes

---

### Runbook 2: DynamoDB Table Corruption

**Scenario**: Data corruption detected in DynamoDB table

**Symptoms**:
- Incorrect data returned by API
- User reports of missing or wrong data
- Data validation errors

**Steps**:
1. Identify affected table and time of corruption
2. Stop writes to affected table (if possible)
3. Determine recovery point (last known good state)
4. Initiate point-in-time recovery
5. Verify restored data integrity
6. Switch application to restored table
7. Investigate root cause

**Expected Duration**: 30-60 minutes

---

### Runbook 3: S3 Content Unavailable

**Scenario**: Training videos or images not accessible

**Symptoms**:
- 404 errors for content
- CloudFront errors
- User reports of missing content

**Steps**:
1. Check S3 bucket accessibility
2. Verify CloudFront distribution status
3. Check S3 replication status
4. If primary bucket unavailable, switch CloudFront to backup bucket
5. Verify content accessible
6. Investigate primary bucket issues

**Expected Duration**: 15-30 minutes

---

### Runbook 4: Lambda Function Failures

**Scenario**: Lambda functions returning errors

**Symptoms**:
- API errors
- Increased Lambda error metrics
- CloudWatch logs showing exceptions

**Steps**:
1. Identify failing Lambda function
2. Check CloudWatch logs for error details
3. Verify IAM permissions
4. Check DynamoDB/S3 connectivity
5. If code issue, rollback to previous version
6. If infrastructure issue, redeploy function
7. Monitor for resolution

**Expected Duration**: 15-45 minutes

---

### Runbook 5: High Latency

**Scenario**: API response times significantly increased

**Symptoms**:
- Slow user experience
- Increased API Gateway latency metrics
- DynamoDB throttling

**Steps**:
1. Identify bottleneck (API Gateway, Lambda, DynamoDB)
2. Check DynamoDB capacity and throttling
3. Check Lambda concurrent executions
4. Review recent deployments
5. Scale resources if needed
6. Implement caching if appropriate
7. Monitor for improvement

**Expected Duration**: 30-60 minutes

---

## Appendix

### Contact Information

**On-Call Rotation**: [PagerDuty/Opsgenie Link]

**Escalation Path**:
1. On-call Engineer
2. Engineering Lead
3. CTO
4. CEO

### Useful Links

- CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=farmer-platform-disaster-recovery
- AWS Backup Console: https://console.aws.amazon.com/backup/home?region=ap-south-1
- Route53 Console: https://console.aws.amazon.com/route53/home
- Incident Management: [Link to incident management tool]

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | DevOps Team | Initial version |
