# Disaster Recovery Testing Schedule

## Overview

Regular testing ensures our disaster recovery procedures work as expected and our team is prepared to respond to incidents. This document outlines the testing schedule and procedures.

---

## Testing Frequency

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| Automated DR Tests | Monthly | 15 minutes | Automated |
| Backup Verification | Weekly | 10 minutes | DevOps Engineer |
| Failover Drill | Quarterly | 4 hours | Full Team |
| Tabletop Exercise | Bi-annually | 2 hours | Leadership + Engineering |
| Full DR Simulation | Annually | 8 hours | Full Team + Stakeholders |

---

## Monthly Automated DR Tests

**Schedule**: 1st of each month at 10:00 AM UTC

**Automated by**: Lambda function `farmer-platform-dr-test`

### Tests Performed

1. **Backup Integrity**
   - Verify DynamoDB backups exist
   - Check backup age (<24 hours)
   - Verify backup completeness

2. **S3 Replication**
   - Check replication status
   - Verify object counts match
   - Test replication latency

3. **DynamoDB Global Tables**
   - Verify table status (ACTIVE)
   - Check point-in-time recovery enabled
   - Verify replication lag

4. **Backup Region Accessibility**
   - Test database queries
   - Measure response time
   - Verify data accessibility

5. **RTO/RPO Compliance**
   - Verify backup frequency
   - Check recovery point age
   - Validate automated failover configuration

### Success Criteria

- All tests pass
- Backup age <24 hours
- Replication lag <15 minutes
- Backup region response time <3 seconds

### Actions on Failure

1. SNS notification sent to operations team
2. On-call engineer investigates within 1 hour
3. Issue logged in incident management system
4. Root cause analysis performed
5. Remediation plan created and executed

---

## Weekly Backup Verification

**Schedule**: Every Monday at 9:00 AM IST

**Owner**: DevOps Engineer

### Checklist

```bash
# 1. Check DynamoDB backup vault
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name farmer-platform-dynamodb-backup-vault \
  --region ap-south-1

# Expected: At least 7 recovery points (daily backups)

# 2. Check S3 backup vault
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name farmer-platform-s3-backup-vault \
  --region ap-south-1

# Expected: At least 7 recovery points

# 3. Verify S3 replication metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name ReplicationLatency \
  --dimensions Name=SourceBucket,Value=farmer-platform-content-production \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average \
  --region ap-south-1

# Expected: Average latency <15 minutes

# 4. Check backup failures
aws cloudwatch get-metric-statistics \
  --namespace AWS/Backup \
  --metric-name NumberOfBackupJobsFailed \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum \
  --region ap-south-1

# Expected: 0 failures

# 5. Document results
echo "Backup verification completed: $(date)" >> /var/log/dr-tests.log
```

### Documentation

Record results in: `infrastructure/logs/backup-verification-YYYY-MM-DD.log`

---

## Quarterly Failover Drill

**Schedule**: Last Saturday of March, June, September, December  
**Time**: 2:00 AM - 6:00 AM IST (low traffic period)  
**Duration**: 4 hours

### Pre-Drill Preparation (1 week before)

#### Week Before Checklist

- [ ] Schedule drill date and time
- [ ] Notify all stakeholders
- [ ] Send calendar invites to participants
- [ ] Review and update DR procedures
- [ ] Verify backup region health
- [ ] Prepare monitoring dashboards
- [ ] Create drill communication templates
- [ ] Set up war room (virtual meeting)
- [ ] Prepare rollback plan

#### Day Before Checklist

- [ ] Verify all participants available
- [ ] Test communication channels
- [ ] Review drill objectives
- [ ] Prepare drill scenario
- [ ] Set up screen sharing
- [ ] Prepare incident log template

### Drill Execution (4 hours)

#### Phase 1: Preparation (30 minutes)

- [ ] All participants join war room
- [ ] Review drill objectives and scenario
- [ ] Assign roles (Incident Commander, Technical Lead, etc.)
- [ ] Open monitoring dashboards
- [ ] Start incident log

#### Phase 2: Simulated Failure (15 minutes)

- [ ] Simulate primary region failure (disable health check or API Gateway)
- [ ] Observe automated failover trigger
- [ ] Monitor CloudWatch logs
- [ ] Verify SNS notifications received

#### Phase 3: Manual Intervention (45 minutes)

- [ ] If automated failover fails, execute manual failover
- [ ] Follow DR procedures step-by-step
- [ ] Document each action taken
- [ ] Verify backup region serving traffic
- [ ] Test critical user flows (authentication, data access)

#### Phase 4: Verification (30 minutes)

- [ ] Verify all services operational
- [ ] Check error rates and latency
- [ ] Test API endpoints
- [ ] Verify data integrity
- [ ] Monitor user impact (if any)

#### Phase 5: Failback (60 minutes)

- [ ] Restore primary region
- [ ] Verify primary region health
- [ ] Execute gradual traffic shift (10% → 25% → 50% → 100%)
- [ ] Monitor metrics during shift
- [ ] Complete failback to primary

#### Phase 6: Debrief (30 minutes)

- [ ] Review drill timeline
- [ ] Discuss what went well
- [ ] Identify issues and gaps
- [ ] Assign action items
- [ ] Schedule follow-up meeting

### Drill Scenarios

#### Scenario 1: Complete Primary Region Failure
- Primary region becomes completely unavailable
- All services down
- Automated failover should trigger

#### Scenario 2: Partial Service Degradation
- DynamoDB throttling in primary region
- High latency but not complete failure
- Decision: failover or scale resources?

#### Scenario 3: Data Corruption
- Corrupted data detected in DynamoDB
- Need to restore from backup
- Point-in-time recovery required

#### Scenario 4: Network Partition
- Primary and backup regions can't communicate
- Global table replication stopped
- Split-brain scenario

### Success Criteria

- [ ] Failover completed within RTO (1 hour)
- [ ] No data loss (RPO: 5 minutes)
- [ ] All services operational in backup region
- [ ] Successful failback to primary
- [ ] All participants followed procedures
- [ ] Incident log complete and accurate

### Post-Drill Actions (1 week after)

- [ ] Write drill report
- [ ] Share results with stakeholders
- [ ] Update DR procedures based on learnings
- [ ] Create tickets for identified issues
- [ ] Schedule remediation work
- [ ] Update training materials

---

## Bi-Annual Tabletop Exercise

**Schedule**: January and July  
**Duration**: 2 hours  
**Participants**: CTO, Engineering Lead, Product Manager, DevOps Team

### Objectives

- Test decision-making processes
- Validate communication procedures
- Identify gaps in DR plan
- Train leadership on DR procedures

### Format

1. **Scenario Presentation** (15 minutes)
   - Present realistic disaster scenario
   - Provide initial information
   - Set the stage

2. **Discussion** (60 minutes)
   - Walk through response steps
   - Discuss decision points
   - Identify challenges
   - Evaluate communication flow

3. **Scenario Evolution** (30 minutes)
   - Introduce complications
   - Test adaptability
   - Evaluate alternative approaches

4. **Debrief** (15 minutes)
   - Review decisions made
   - Identify improvements
   - Assign action items

### Sample Scenarios

1. **Scenario: Regional AWS Outage**
   - Multiple AWS services down in primary region
   - Estimated recovery time: 4+ hours
   - Decision: Wait or failover?

2. **Scenario: Security Breach**
   - Unauthorized access detected
   - Data exfiltration suspected
   - Need to isolate systems and recover

3. **Scenario: Database Corruption**
   - Widespread data corruption
   - Multiple tables affected
   - Need to determine recovery point

4. **Scenario: Cascading Failures**
   - Initial Lambda failure
   - Leads to DynamoDB throttling
   - Causes API Gateway errors
   - Decision tree for resolution

---

## Annual Full DR Simulation

**Schedule**: November (before holiday season)  
**Duration**: 8 hours  
**Participants**: Full engineering team, product team, support team, leadership

### Objectives

- Test complete DR capabilities
- Validate all procedures end-to-end
- Train entire team
- Identify systemic issues
- Build team confidence

### Simulation Plan

#### Week 1: Planning
- Define simulation scope
- Create detailed scenario
- Prepare test environment
- Notify all stakeholders

#### Week 2: Preparation
- Review procedures with all teams
- Set up monitoring and logging
- Prepare communication channels
- Create success criteria

#### Simulation Day

**Phase 1: Normal Operations** (1 hour)
- System running normally
- Teams monitoring dashboards
- Baseline metrics recorded

**Phase 2: Disaster Strikes** (30 minutes)
- Simulate major disaster (e.g., region failure)
- Teams detect and assess
- Incident response initiated

**Phase 3: Emergency Response** (2 hours)
- Execute failover procedures
- All teams coordinate
- Communication with stakeholders
- Service restoration

**Phase 4: Operations in Backup Region** (2 hours)
- Run on backup region
- Monitor stability
- Handle simulated user issues
- Test all critical flows

**Phase 5: Recovery Planning** (1 hour)
- Assess primary region
- Plan failback strategy
- Coordinate with teams

**Phase 6: Failback** (1.5 hours)
- Execute failback procedures
- Gradual traffic shift
- Verify service restoration
- Return to normal operations

#### Post-Simulation (Week after)
- Comprehensive report
- Team retrospective
- Update all documentation
- Implement improvements

### Metrics to Track

- Time to detect failure
- Time to initiate response
- Time to complete failover
- Time to verify services
- Time to complete failback
- Number of issues encountered
- Communication effectiveness
- Team coordination quality

---

## Test Results Tracking

### Monthly Test Results Template

```markdown
# DR Test Results - [Month Year]

**Date**: [Date]  
**Test Type**: Automated Monthly Test  
**Status**: PASS/FAIL

## Test Results

| Test | Status | Details |
|------|--------|---------|
| Backup Integrity | PASS/FAIL | [Details] |
| S3 Replication | PASS/FAIL | [Details] |
| Global Tables | PASS/FAIL | [Details] |
| Backup Region | PASS/FAIL | [Details] |
| RTO/RPO Compliance | PASS/FAIL | [Details] |

## Issues Found

1. [Issue description]
   - Severity: High/Medium/Low
   - Action: [Action taken]
   - Owner: [Name]

## Recommendations

1. [Recommendation]

## Next Steps

- [ ] [Action item 1]
- [ ] [Action item 2]
```

### Quarterly Drill Report Template

```markdown
# DR Drill Report - Q[Quarter] [Year]

**Date**: [Date]  
**Duration**: [Duration]  
**Scenario**: [Scenario description]  
**Participants**: [List]

## Executive Summary

[Brief overview of drill results]

## Timeline

| Time | Event | Duration |
|------|-------|----------|
| [Time] | [Event] | [Duration] |

## Metrics

- **Time to Failover**: [Time] (Target: 1 hour)
- **Data Loss**: [Amount] (Target: 5 minutes)
- **Services Restored**: [%] (Target: 100%)
- **Failback Time**: [Time]

## What Went Well

1. [Item]
2. [Item]

## Issues Encountered

1. [Issue]
   - Impact: [Impact]
   - Root Cause: [Cause]
   - Resolution: [Resolution]

## Lessons Learned

1. [Lesson]

## Action Items

| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Item] | [Name] | [Date] | [Status] |

## Recommendations

1. [Recommendation]

## Conclusion

[Overall assessment]
```

---

## Continuous Improvement

### Review Cycle

- **Monthly**: Review automated test results
- **Quarterly**: Review drill results and update procedures
- **Annually**: Comprehensive DR plan review

### Metrics to Track Over Time

1. **Failover Success Rate**: Target >95%
2. **Average Failover Time**: Target <1 hour
3. **Test Pass Rate**: Target 100%
4. **Backup Success Rate**: Target 100%
5. **Team Readiness Score**: Target >90%

### Improvement Process

1. Collect feedback from all tests and drills
2. Identify patterns and recurring issues
3. Prioritize improvements
4. Implement changes
5. Validate through testing
6. Update documentation

---

## Appendix

### Test Calendar 2024

| Month | Automated Test | Backup Verification | Drill/Exercise |
|-------|----------------|---------------------|----------------|
| January | ✓ | ✓✓✓✓ | Tabletop Exercise |
| February | ✓ | ✓✓✓✓ | - |
| March | ✓ | ✓✓✓✓ | Failover Drill (Q1) |
| April | ✓ | ✓✓✓✓ | - |
| May | ✓ | ✓✓✓✓ | - |
| June | ✓ | ✓✓✓✓ | Failover Drill (Q2) |
| July | ✓ | ✓✓✓✓ | Tabletop Exercise |
| August | ✓ | ✓✓✓✓ | - |
| September | ✓ | ✓✓✓✓ | Failover Drill (Q3) |
| October | ✓ | ✓✓✓✓ | - |
| November | ✓ | ✓✓✓✓ | Full DR Simulation |
| December | ✓ | ✓✓✓✓ | Failover Drill (Q4) |

---

**Document Owner**: DevOps Team  
**Last Updated**: 2024-01-15  
**Next Review**: 2024-07-15
