# Lambda Timeout Fix

## Problem
When calling `/auth/send-otp`, getting error:
```json
{"message": "Endpoint request timed out"}
```

## Root Cause
Lambda functions were configured with VPC but:
1. Lambda in private subnets
2. No NAT Gateway configured
3. VPC endpoints only attached to public route table
4. Lambda couldn't reach DynamoDB/SNS → timeout after 29 seconds

## Solution
**Removed VPC configuration from all Lambda functions**

Lambda doesn't need VPC to access AWS services like:
- DynamoDB
- SNS
- S3
- CloudWatch

VPC is only needed if Lambda needs to access:
- RDS databases in private subnets
- ElastiCache clusters
- Private APIs
- On-premise resources via VPN

## Changes Made

### File: `infrastructure/terraform/lambda.tf`

Removed `vpc_config` block from all 6 Lambda functions:
- ✅ auth
- ✅ recommendations
- ✅ schemes
- ✅ market_prices
- ✅ alerts
- ✅ training

**Before:**
```terraform
vpc_config {
  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids = [aws_security_group.lambda.id]
}
```

**After:**
```terraform
# VPC config removed - Lambda doesn't need VPC to access DynamoDB/SNS
# Keeping Lambda outside VPC prevents timeout issues
```

## Deploy the Fix

```bash
cd infrastructure/terraform

# Apply changes
terraform apply \
  -var="environment=production" \
  -var="alert_email=your@email.com" \
  -auto-approve

# Wait for deployment
sleep 30

# Test
curl -X POST https://1s6y4bwfaf.execute-api.ap-south-1.amazonaws.com/production/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9729785623"}'
```

## Expected Result

**Before Fix:**
```json
{"message": "Endpoint request timed out"}
```

**After Fix:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

## Alternative Solutions (Not Recommended)

If you really need Lambda in VPC, you must add ONE of these:

### Option A: NAT Gateway (Costs ~$32/month)
```terraform
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}
```

### Option B: VPC Endpoints (Free, but limited)
```terraform
# Add private route table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

# Update VPC endpoints to use private route table
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${var.primary_region}.dynamodb"
  route_table_ids = [aws_route_table.private.id]  # Changed from public
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${var.primary_region}.s3"
  route_table_ids = [aws_route_table.private.id]  # Changed from public
}

# Add SNS VPC endpoint (interface endpoint)
resource "aws_vpc_endpoint" "sns" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.primary_region}.sns"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}
```

**Note:** Interface endpoints (SNS) cost ~$7/month per endpoint.

## Recommendation

**Keep Lambda outside VPC** (current fix) because:
- ✅ No additional costs
- ✅ Faster cold starts
- ✅ No timeout issues
- ✅ Simpler architecture
- ✅ AWS services accessible by default

Only use VPC if you have private resources Lambda must access.

## Verification

After deployment, check Lambda configuration:

```bash
# Check if VPC is removed
aws lambda get-function-configuration \
  --function-name farmer-platform-auth-production \
  --region ap-south-1 \
  --query 'VpcConfig'

# Should return empty or null
```

## Testing

```bash
# Test all endpoints
./check-api-gateway.sh

# Or test manually
curl -X POST https://1s6y4bwfaf.execute-api.ap-south-1.amazonaws.com/production/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9729785623"}'
```

## Rollback

If you need to rollback (not recommended):

```bash
cd infrastructure/terraform
git checkout HEAD~1 -- lambda.tf
terraform apply -var="environment=production" -var="alert_email=your@email.com"
```

But you'll get timeout errors again unless you add NAT Gateway or proper VPC endpoints.
