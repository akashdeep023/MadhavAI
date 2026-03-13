#!/bin/bash

# Seed Schemes Data Script
# This script populates the DynamoDB schemes table with initial government scheme data

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-https://1s6y4bwfaf.execute-api.ap-south-1.amazonaws.com/production}"
ENVIRONMENT="${ENVIRONMENT:-production}"

echo "=========================================="
echo "Seeding Government Schemes Data"
echo "=========================================="
echo "API Base URL: $API_BASE_URL"
echo "Environment: $ENVIRONMENT"
echo ""

# Seed schemes
echo "Seeding schemes..."
RESPONSE=$(curl -s -X POST \
  "${API_BASE_URL}/schemes/seed" \
  -H "Content-Type: application/json")

echo "Response: $RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "successfully"; then
  echo "✓ Schemes seeded successfully!"
else
  echo "✗ Failed to seed schemes"
  exit 1
fi

echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="

# Verify schemes were created
echo "Fetching schemes to verify..."
SCHEMES=$(curl -s -X GET \
  "${API_BASE_URL}/schemes" \
  -H "Content-Type: application/json")

SCHEME_COUNT=$(echo "$SCHEMES" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

echo "Total schemes in database: $SCHEME_COUNT"
echo ""

if [ "$SCHEME_COUNT" -gt 0 ]; then
  echo "✓ Verification successful!"
  echo ""
  echo "Available schemes:"
  echo "$SCHEMES" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | while read -r name; do
    echo "  - $name"
  done
else
  echo "✗ Verification failed - no schemes found"
  exit 1
fi

echo ""
echo "=========================================="
echo "Seeding Complete!"
echo "=========================================="
