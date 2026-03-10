#!/bin/bash
# Build script for Lambda functions

set -e

echo "Building Lambda functions..."

# Create dist directory
mkdir -p dist/lambda

# Check if Lambda directory exists
if [ ! -d "infrastructure/lambda" ]; then
  echo "⚠️  No Lambda functions found in infrastructure/lambda/"
  echo "Skipping Lambda build."
  exit 0
fi

# Find all Lambda function directories
LAMBDA_DIRS=$(find infrastructure/lambda -mindepth 1 -maxdepth 1 -type d)

if [ -z "$LAMBDA_DIRS" ]; then
  echo "⚠️  No Lambda function directories found"
  echo "Skipping Lambda build."
  exit 0
fi

# Build each Lambda function
for lambda_dir in $LAMBDA_DIRS; do
  func=$(basename "$lambda_dir")
  echo "Building $func..."
  
  # Create temp directory
  TEMP_DIR=$(mktemp -d)
  
  # Copy source files
  cp -r "$lambda_dir"/* "$TEMP_DIR/"
  
  # Install production dependencies if package.json exists
  if [ -f "$TEMP_DIR/package.json" ]; then
    cd "$TEMP_DIR"
    npm install --production
    cd -
  fi
  
  # Create zip file
  cd "$TEMP_DIR"
  zip -r "$func.zip" .
  cd -
  
  # Move to dist
  mv "$TEMP_DIR/$func.zip" dist/lambda/
  
  # Cleanup
  rm -rf "$TEMP_DIR"
  
  echo "✓ Built $func.zip"
done

echo "All Lambda functions built successfully!"
