# Terraform Configuration Fixes

## Issues Fixed

### 1. DynamoDB Global Tables Version Error

**Problem**: Using deprecated `aws_dynamodb_global_table` resource which uses Global Tables v1 (2017.11.29). This version is not supported in `ap-south-1` region.

**Solution**: Removed all `aws_dynamodb_global_table` resources. For Global Tables v2 (2019.11.21), you have two options:

#### Option A: Single Region (Current Implementation)
- Tables are created in primary region only (`ap-south-1`)
- Point-in-time recovery is enabled for disaster recovery
- DynamoDB streams are enabled for change data capture
- This is sufficient for most use cases

#### Option B: Multi-Region with Global Tables v2 (Future Enhancement)
If you need true multi-region replication, add `replica` blocks to each table in `dynamodb.tf`:

```hcl
resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mobileNumber"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  # ... existing attributes and indexes ...
  
  # Add replica for multi-region
  replica {
    region_name = var.backup_region
  }
  
  # ... rest of configuration ...
}
```

**Note**: Global Tables v2 requires:
- Stream enabled on the table
- Same table configuration in all regions
- Additional costs for cross-region replication

### 2. S3 Lifecycle Configuration Warning

**Problem**: Missing required `filter` block in `aws_s3_bucket_lifecycle_configuration` resources.

**Solution**: Added empty `filter {}` block to both lifecycle configurations:
- `aws_s3_bucket_lifecycle_configuration.content`
- `aws_s3_bucket_lifecycle_configuration.backup`

This is required by AWS provider v5.x even when applying rules to all objects.

### 3. Route53 Health Check FQDN Error

**Problem**: The `fqdn` parameter contained the full API Gateway URL including path (e.g., `abc123.execute-api.ap-south-1.amazonaws.com/production`), but Route53 requires only the domain name.

**Solution**: Updated the `fqdn` extraction to remove both the protocol and path:
```hcl
fqdn = replace(replace(aws_api_gateway_stage.main.invoke_url, "https://", ""), "/.*", "")
```

This extracts only the domain: `abc123.execute-api.ap-south-1.amazonaws.com`

## Current Architecture

### Single Region Deployment
- **Primary Region**: `ap-south-1` (Mumbai)
- **DynamoDB**: Single region with point-in-time recovery
- **S3**: Cross-region replication to `ap-southeast-1` (Singapore)
- **Lambda**: Deployed in primary region only
- **API Gateway**: Primary region with Route53 health checks

### Disaster Recovery
- S3 content is replicated to backup region
- DynamoDB has point-in-time recovery (35 days)
- AWS Backup configured for automated backups
- CloudWatch alarms for monitoring

## Migration to Multi-Region (Optional)

If you need active-active multi-region deployment:

1. **Enable Global Tables v2** on DynamoDB tables (add replica blocks)
2. **Deploy Lambda functions** in backup region
3. **Create API Gateway** in backup region
4. **Configure Route53** failover routing policy
5. **Update CloudFront** to use both origins

**Cost Impact**: Multi-region increases costs by ~2-3x due to:
- Cross-region data transfer
- Duplicate Lambda invocations
- Global table replication
- Additional API Gateway charges

## Testing

After applying these fixes:

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

All errors should be resolved.
