#!/bin/bash
# Rollback script for failed deployments

set -e

ENVIRONMENT=${1:-staging}
REGION=${2:-ap-south-1}

echo "Rolling back $ENVIRONMENT deployment..."

# Get previous Terraform state
cd infrastructure/terraform

# List available state versions
echo "Available state versions:"
aws s3 ls s3://farmer-platform-terraform-state/infrastructure/ --recursive | grep tfstate

# Prompt for version to rollback to
read -p "Enter the state version timestamp to rollback to (or 'latest' for previous): " VERSION

if [ "$VERSION" = "latest" ]; then
  # Get the second most recent state
  STATE_FILE=$(aws s3 ls s3://farmer-platform-terraform-state/infrastructure/ --recursive | grep tfstate | tail -2 | head -1 | awk '{print $4}')
else
  STATE_FILE="infrastructure/terraform.tfstate.$VERSION"
fi

echo "Rolling back to state: $STATE_FILE"

# Download previous state
aws s3 cp "s3://farmer-platform-terraform-state/$STATE_FILE" terraform.tfstate

# Apply previous state
terraform apply -auto-approve \
  -var="environment=$ENVIRONMENT" \
  -var="primary_region=$REGION"

echo "Rollback completed!"

# Verify health
API_URL=$(terraform output -raw api_gateway_url)
curl -f "$API_URL/health" || {
  echo "Health check failed after rollback!"
  exit 1
}

echo "✓ Rollback verified!"
