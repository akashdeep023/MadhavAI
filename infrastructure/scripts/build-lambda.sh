#!/bin/bash
# Build script for Lambda functions

set -e

echo "Building Lambda functions..."

# Create dist directory
mkdir -p dist/lambda

# Lambda functions to build
FUNCTIONS=("auth" "recommendations" "schemes" "market-prices" "alerts" "training")

for func in "${FUNCTIONS[@]}"; do
  echo "Building $func..."
  
  # Create temp directory
  TEMP_DIR=$(mktemp -d)
  
  # Copy source files
  cp -r src/lambda/$func/* $TEMP_DIR/
  
  # Install production dependencies
  cd $TEMP_DIR
  npm install --production
  
  # Create zip file
  zip -r $func.zip .
  
  # Move to dist
  mv $func.zip ../../dist/lambda/
  
  # Cleanup
  cd -
  rm -rf $TEMP_DIR
  
  echo "✓ Built $func.zip"
done

echo "All Lambda functions built successfully!"
