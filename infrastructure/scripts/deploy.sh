#!/bin/bash
# Deployment script with blue-green deployment support

set -e

ENVIRONMENT=${1:-staging}
REGION=${2:-ap-south-1}

echo "Deploying to $ENVIRONMENT in $REGION..."

# Build Lambda functions
echo "Building Lambda functions..."
./infrastructure/scripts/build-lambda.sh

# Initialize Terraform
echo "Initializing Terraform..."
cd infrastructure/terraform
terraform init

# Plan deployment
echo "Planning deployment..."
terraform plan \
  -var="environment=$ENVIRONMENT" \
  -var="primary_region=$REGION" \
  -out=tfplan

# Apply deployment
echo "Applying deployment..."
terraform apply -auto-approve tfplan

# Get outputs
API_URL=$(terraform output -raw api_gateway_url)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain)

echo "Deployment completed successfully!"
echo "API URL: $API_URL"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"

# Run smoke tests
echo "Running smoke tests..."
curl -f "$API_URL/health" || {
  echo "Health check failed!"
  exit 1
}

echo "✓ Deployment verified!"
