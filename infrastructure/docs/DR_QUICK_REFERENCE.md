# Disaster Recovery Quick Reference Guide

## Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| On-Call Engineer | [PagerDuty] | - |
| Engineering Lead | [Name] | [Phone] |
| CTO | [Name] | [Phone] |

## Critical Information

- **Primary Region**: ap-south-1 (Mumbai)
- **Backup Region**: ap-southeast-1 (Singapore)
- **RTO**: 1 hour
- **RPO**: 5 minutes

## Quick Decision Tree

```
Is the service down?
├─ YES → Is automated failover running?
│   ├─ YES → Monitor progress (15 min)
│   └─ NO → Execute Manual Failover (Page 2)
└─ NO → Is performance degraded?
    ├─ YES → Check High Latency Runbook (Page 4)
    └─ NO → Investigate specific component
```

## 1-Minute Failover Decision

### Execute Failover If:
- ✅ Primary region health checks failing for >3 minutes
- ✅ API error rate >10% for >5 minutes
- ✅ Complete service outage
- ✅ Backup region verified healthy

### DO NOT Failover If:
- ❌ Isolated component failure
- ❌ Backup region unhealthy
- ❌ Temporary network blip (<2 minutes)
- ❌ Scheduled maintenance in progress

## 5-Minute Manual Failover

```bash
# 1. Verify backup region (30 seconds)
aws dynamodb describe-table \
  --table-name farmer-platform-users-production \
  --region ap-southeast-1

# 2. Update DNS (2 minutes)
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://failover-dns.json

# 3. Verify (1 minute)
curl https://api.farmer-platform.com/health

# 4. Notify (1 minute)
aws sns publish \
  --topic-arn <SNS_ARN> \
  --subject "FAILOVER EXECUTED" \
  --message "Failover to backup region completed"
```

## Common Issues & Quick Fixes

### Issue: API Returning 5xx Errors

**Quick Check**:
```bash
# Check Lambda errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region ap-south-1
```

**Quick Fix**: Redeploy Lambda or failover

---

### Issue: DynamoDB Throttling

**Quick Check**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=farmer-platform-users-production \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --region ap-south-1
```

**Quick Fix**: DynamoDB auto-scales, wait 5 minutes or increase capacity manually

---

### Issue: S3 Content Not Loading

**Quick Check**:
```bash
aws s3 ls s3://farmer-platform-content-production --region ap-south-1
```

**Quick Fix**: Switch CloudFront to backup bucket

---

## Pre-Configured Commands

Save these as shell aliases for quick access:

```bash
# Add to ~/.bashrc or ~/.zshrc

alias dr-check-primary='aws cloudwatch get-metric-statistics --namespace AWS/Route53 --metric-name HealthCheckStatus --start-time $(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 60 --statistics Minimum --region ap-south-1'

alias dr-check-backup='aws dynamodb describe-table --table-name farmer-platform-users-production --region ap-southeast-1'

alias dr-failover='bash /path/to/failover-script.sh'

alias dr-notify='aws sns publish --topic-arn <SNS_ARN> --subject "DR Event" --message'
```

## Monitoring Dashboards

- **Main Dashboard**: https://console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=farmer-platform-disaster-recovery
- **Health Checks**: https://console.aws.amazon.com/route53/healthchecks/home
- **Backup Status**: https://console.aws.amazon.com/backup/home?region=ap-south-1

## Automated Systems

### Automated Failover
- **Trigger**: 3 consecutive health check failures (90 seconds)
- **Action**: Lambda function executes failover
- **Notification**: SNS alert sent
- **Expected Duration**: 15 minutes

### Automated Backups
- **DynamoDB**: Daily at 2:00 AM UTC
- **S3**: Continuous replication
- **Retention**: 30 days (daily), 90 days (weekly)

### Automated Testing
- **DR Tests**: Monthly on 1st at 10:00 AM UTC
- **Failover Drills**: Quarterly (last Saturday)

## Verification Checklist

After any DR action:

- [ ] API responding (curl https://api.farmer-platform.com/health)
- [ ] Authentication working (test OTP flow)
- [ ] Database accessible (query test)
- [ ] Content loading (check training videos)
- [ ] Error rates normal (<1%)
- [ ] Latency acceptable (<3 seconds)
- [ ] Stakeholders notified
- [ ] Incident logged

## Recovery Time Estimates

| Scenario | Automated | Manual |
|----------|-----------|--------|
| Complete region failure | 15 min | 30 min |
| DynamoDB corruption | N/A | 45 min |
| S3 content unavailable | N/A | 20 min |
| Lambda failures | N/A | 30 min |
| High latency | N/A | 45 min |

## Important Notes

⚠️ **Always verify backup region health before failover**

⚠️ **Document all actions taken during incident**

⚠️ **Communicate early and often with stakeholders**

⚠️ **Never skip verification steps to save time**

⚠️ **Schedule failback during low-traffic hours**

## Post-Incident Actions

1. Create incident report (within 24 hours)
2. Schedule blameless postmortem (within 48 hours)
3. Update runbooks with lessons learned
4. Implement preventive measures
5. Test fixes in staging environment

## Training Resources

- Full DR Procedures: `/infrastructure/docs/DISASTER_RECOVERY_PROCEDURES.md`
- Terraform Configuration: `/infrastructure/terraform/disaster-recovery.tf`
- Lambda Functions: `/infrastructure/lambda/`
- Deployment Guide: `/infrastructure/DEPLOYMENT_GUIDE.md`

---

**Last Updated**: 2024-01-15  
**Version**: 1.0  
**Owner**: DevOps Team
