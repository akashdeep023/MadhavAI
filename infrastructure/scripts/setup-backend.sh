#!/bin/bash
# Setup Terraform backend (S3 + DynamoDB)

set -e

BUCKET_NAME="farmer-platform-terraform-state"
TABLE_NAME="terraform-state-lock"
REGION="ap-south-1"

echo "Setting up Terraform backend..."

# Create S3 bucket
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || echo "Bucket already exists"

# Enable versioning
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable encryption
echo "Enabling encryption..."
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
echo "Blocking public access..."
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB table
echo "Creating DynamoDB table: $TABLE_NAME"
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || echo "Table already exists"

# Wait for table to be active
echo "Waiting for table to be active..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION

echo "✓ Terraform backend setup complete!"
echo ""
echo "Backend configuration:"
echo "  Bucket: $BUCKET_NAME"
echo "  Table: $TABLE_NAME"
echo "  Region: $REGION"
