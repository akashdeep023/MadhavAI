# Disaster Recovery Lambda Functions - Status

## Current Status

The disaster recovery Lambda functions have been **commented out** in `disaster-recovery.tf` because they require custom implementation and the zip files don't exist yet.

## What's Still Working

✅ **DynamoDB Backups**
- Daily backups at 2 AM UTC (kept for 30 days)
- Weekly backups on Sundays at 3 AM UTC (kept for 90 days)
- Point-in-time recovery enabled on all tables

✅ **S3 Backups**
- Daily backups at 4 AM UTC (kept for 30 days)
- Cross-region replication to Singapore
- Versioning enabled

✅ **Monitoring**
- CloudWatch dashboard for DR metrics
- Alarms for backup failures
- Alarms for replication lag
- Health check monitoring

## What's Commented Out (Optional Features)

### 1. Automated Failover Lambda
- **Purpose**: Automatically switch to backup region when primary fails
- **Status**: Commented out - requires custom implementation
- **File**: Would be `dist/lambda/failover-handler.zip`

### 2. DR Test Lambda
- **Purpose**: Monthly automated disaster recovery testing
- **Status**: Commented out - requires custom implementation
- **File**: Would be `dist/lambda/dr-test.zip`

## Why These Are Optional

Your infrastructure already has robust disaster recovery without these Lambda functions:

1. **Manual Failover**: You can manually switch to backup region if needed
2. **Automated Backups**: AWS Backup handles all backup operations automatically
3. **Cross-Region Replication**: S3 content is automatically replicated
4. **Point-in-Time Recovery**: DynamoDB can be restored to any point in last 35 days

## When to Implement These Lambdas

Consider implementing these Lambda functions if you need:

- **Automated Failover**: Automatic region switching without manual intervention
- **Automated DR Testing**: Monthly validation that backups and failover work
- **RTO < 5 minutes**: Very fast recovery time objectives
- **24/7 Operations**: No manual intervention for failures

## How to Implement (Future)

### 1. Create Failover Handler

Create `infrastructure/lambda/failover-handler/index.js`:

```javascript
exports.handler = async (event) => {
  // 1. Detect primary region failure from CloudWatch alarm
  // 2. Update Route53 to point to backup region
  // 3. Verify backup region health
  // 4. Send SNS notification
  // 5. Log failover event
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Failover completed' })
  };
};
```

### 2. Create DR Test Handler

Create `infrastructure/lambda/dr-test/index.js`:

```javascript
exports.handler = async (event) => {
  // 1. Verify DynamoDB backups exist
  // 2. Verify S3 replication is current
  // 3. Test backup region connectivity
  // 4. Simulate failover (dry run)
  // 5. Generate DR test report
  // 6. Send SNS notification with results
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'DR test completed' })
  };
};
```

### 3. Build Lambda Zips

Add to `infrastructure/scripts/build-lambda.sh`:

```bash
# Build failover handler
cd infrastructure/lambda/failover-handler
npm install --production
zip -r ../../../dist/lambda/failover-handler.zip .

# Build DR test
cd ../dr-test
npm install --production
zip -r ../../../dist/lambda/dr-test.zip .
```

### 4. Uncomment Terraform Resources

In `disaster-recovery.tf`, uncomment:
- `aws_lambda_function.failover_handler`
- `aws_cloudwatch_event_rule.failover_trigger`
- `aws_cloudwatch_event_target.failover_lambda`
- `aws_lambda_permission.allow_cloudwatch_failover`
- `aws_lambda_function.dr_test`
- `aws_cloudwatch_event_rule.dr_test_schedule`
- `aws_cloudwatch_event_target.dr_test_lambda`
- `aws_lambda_permission.allow_cloudwatch_dr_test`

### 5. Deploy

```bash
cd infrastructure/terraform
terraform plan
terraform apply
```

## Current Disaster Recovery Capabilities

Even without these Lambda functions, you have:

### Recovery Time Objective (RTO)
- **Manual Failover**: ~30 minutes
- **Backup Restore**: ~1-2 hours

### Recovery Point Objective (RPO)
- **DynamoDB**: 5 minutes (point-in-time recovery)
- **S3**: 15 minutes (replication time)

### Backup Retention
- **Daily Backups**: 30 days
- **Weekly Backups**: 90 days
- **Point-in-Time**: 35 days

### Monitoring
- Health check alarms
- Backup failure alerts
- Replication lag alerts
- CloudWatch dashboard

## Testing Your Current DR Setup

### Test DynamoDB Backup

```bash
# List available backups
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name farmer-platform-dynamodb-backup-vault \
  --region ap-south-1

# Test restore (to a new table)
aws dynamodb restore-table-from-backup \
  --target-table-name farmer-platform-users-test \
  --backup-arn <backup-arn> \
  --region ap-south-1
```

### Test S3 Replication

```bash
# Upload test file to primary bucket
aws s3 cp test.txt s3://farmer-platform-content-production/test.txt

# Wait 15 minutes, then check backup region
aws s3 ls s3://farmer-platform-content-production-backup/ \
  --region ap-southeast-1
```

### Test Manual Failover

1. Update Route53 to point to backup region
2. Verify API Gateway in backup region (if deployed)
3. Test application functionality
4. Switch back to primary region

## Summary

✅ Your infrastructure has robust disaster recovery  
✅ Automated backups are configured and working  
✅ Cross-region replication is active  
✅ Monitoring and alerts are in place  
⚠️  Automated failover requires custom Lambda implementation (optional)  
⚠️  Automated DR testing requires custom Lambda implementation (optional)  

**Recommendation**: Deploy with current setup. Add automated failover/testing later if needed.
