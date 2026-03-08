#!/bin/bash
# Build script for disaster recovery Lambda functions

set -e

echo "Building disaster recovery Lambda functions..."

# Function to build a Lambda
build_lambda() {
  local lambda_name=$1
  local lambda_dir="infrastructure/lambda/${lambda_name}"
  
  echo "Building ${lambda_name}..."
  
  cd "${lambda_dir}"
  
  # Install dependencies
  npm install --production
  
  # Create deployment package
  zip -r "../${lambda_name}.zip" . -x "*.git*" "*.DS_Store"
  
  cd - > /dev/null
  
  echo "✓ ${lambda_name} built successfully"
}

# Build failover handler
build_lambda "failover-handler"

# Build DR test function
build_lambda "dr-test"

echo ""
echo "All Lambda functions built successfully!"
echo "Deployment packages created:"
echo "  - infrastructure/lambda/failover-handler.zip"
echo "  - infrastructure/lambda/dr-test.zip"
