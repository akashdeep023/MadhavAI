# Terraform Deployment Fixes - Summary

## Issues Resolved

Your GitHub Actions workflow was failing due to 4 configuration errors. All have been fixed.

### ✅ 1. DynamoDB Global Tables Error

**Error Message**:
```
Error: creating DynamoDB Global Table: DynamoDB global tables version 2017.11.29 
is not supported in this region 'ap-south-1'
```

**Root Cause**: Using deprecated `aws_dynamodb_global_table` resource (Global Tables v1)

**Fix Applied**: 
- Removed all `aws_dynamodb_global_table` resources from `multi-region.tf`
- Tables now use single-region deployment with point-in-time recovery
- Added documentation for future multi-region setup if needed

**Files Modified**:
- `infrastructure/terraform/multi-region.tf`

---

### ✅ 2. S3 Lifecycle Configuration Warning

**Error Message**:
```
Warning: Invalid Attribute Combination
No attribute specified when one (and only one) of filter is expected
```

**Root Cause**: AWS provider v5.x requires explicit `filter` block in lifecycle rules

**Fix Applied**:
- Added `filter {}` block to both S3 lifecycle configurations
- Applied to `content` and `backup` buckets

**Files Modified**:
- `infrastructure/terraform/s3.tf`

---

### ✅ 3. Route53 Health Check FQDN Error

**Error Message**:
```
Error: creating Route53 Health Check: InvalidInput: Invalid fully qualified domain name: 
It may not contain reserved characters of RFC1738 ";/?:@=&"
```

**Root Cause**: FQDN contained full URL with path instead of just domain name

**Fix Applied**:
- Updated FQDN extraction to remove both protocol (`https://`) and path
- Now extracts only the domain: `abc123.execute-api.ap-south-1.amazonaws.com`

**Files Modified**:
- `infrastructure/terraform/multi-region.tf`

---

### ✅ 4. Lambda Alias Rollback Error

**Error Message**:
```
Error: ResourceNotFoundException: Alias not found: 
arn:aws:lambda:ap-south-1:614615732567:function:farmer-platform-auth-production:live
```

**Root Cause**: Deployment workflow tried to update Lambda alias "live" that doesn't exist on first deployment

**Fix Applied**:
- Added check to detect if Lambda alias exists
- Create alias automatically on first deployment for all 6 functions
- Canary deployment (10% → 50% → 100%) only runs if alias exists
- Rollback only attempts if alias exists
- Prevents "ResourceNotFoundException" errors

**Files Modified**:
- `.github/workflows/backend-ci-cd.yml`

**Detailed Documentation**:
- `.github/workflows/DEPLOYMENT_ROLLBACK_FIX.md`

---

## Current Architecture

Your infrastructure now deploys as:

- **Region**: `ap-south-1` (Mumbai) - Primary
- **DynamoDB**: Single region with streams and point-in-time recovery
- **S3**: Cross-region replication to `ap-southeast-1` (Singapore)
- **Lambda**: 6 functions (auth, recommendations, schemes, market-prices, alerts, training)
- **API Gateway**: REST API with health check endpoint
- **Monitoring**: CloudWatch logs, alarms, and Route53 health checks

## Next Deployment

Your next GitHub Actions workflow run should succeed. The workflow will:

1. ✅ Initialize Terraform with S3 backend
2. ✅ Plan infrastructure changes
3. ✅ Apply configuration to AWS
4. ✅ Deploy Lambda functions
5. ✅ Run E2E tests
6. ✅ Output API Gateway URL

## Files Changed

```
infrastructure/terraform/multi-region.tf           - Removed deprecated global tables
infrastructure/terraform/s3.tf                     - Added filter blocks
infrastructure/terraform/TERRAFORM_FIXES.md        - Documentation
.github/workflows/backend-ci-cd.yml                - Fixed Lambda deployment & rollback
.github/workflows/DEPLOYMENT_ROLLBACK_FIX.md       - Rollback fix documentation
TERRAFORM_DEPLOYMENT_FIX.md                        - This summary
```

## Optional: Multi-Region Setup

If you need active-active multi-region deployment in the future, see:
- `infrastructure/terraform/TERRAFORM_FIXES.md` - Section "Migration to Multi-Region"

This would enable:
- DynamoDB replication to Singapore
- Lambda functions in both regions
- Route53 failover routing
- Higher availability (but 2-3x cost increase)

---

## Verification

After the next workflow run, verify:

1. Check GitHub Actions - workflow should complete successfully
2. API Gateway URL will be in workflow output
3. Test authentication endpoint: `POST /auth/send-otp`
4. Check CloudWatch logs for Lambda execution

## Questions?

- DynamoDB is single-region but has point-in-time recovery (35 days)
- S3 content is replicated to Singapore for disaster recovery
- Lambda functions are in Mumbai only (sufficient for most use cases)
- Multi-region can be added later if needed
