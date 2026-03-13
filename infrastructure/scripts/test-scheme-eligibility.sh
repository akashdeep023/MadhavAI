#!/bin/bash

# Test Scheme Eligibility Script
# This script tests the eligibility checking functionality

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-https://1s6y4bwfaf.execute-api.ap-south-1.amazonaws.com/production}"

echo "=========================================="
echo "Testing Scheme Eligibility Checker"
echo "=========================================="
echo "API Base URL: $API_BASE_URL"
echo ""

# Test Case 1: Small farmer in Maharashtra (should be eligible for most schemes)
echo "Test Case 1: Small farmer in Maharashtra"
echo "----------------------------------------"

TEST_PROFILE_1='{
  "userId": "test-user-1",
  "farmSize": 2,
  "location": {
    "state": "Maharashtra",
    "district": "Pune"
  },
  "primaryCrops": ["wheat", "rice"]
}'

RESPONSE_1=$(curl -s -X POST \
  "${API_BASE_URL}/schemes/check-eligibility" \
  -H "Content-Type: application/json" \
  -d "{
    \"schemeId\": \"pm-kisan-2024\",
    \"userProfile\": $TEST_PROFILE_1
  }")

echo "Scheme: PM-KISAN"
echo "Response: $RESPONSE_1"
echo ""

if echo "$RESPONSE_1" | grep -q '"isEligible":true'; then
  echo "✓ Test Case 1 Passed: User is eligible"
else
  echo "✗ Test Case 1 Failed: User should be eligible"
fi

echo ""

# Test Case 2: Large farmer (should not be eligible for PM-KISAN)
echo "Test Case 2: Large farmer (exceeds farm size limit)"
echo "----------------------------------------------------"

TEST_PROFILE_2='{
  "userId": "test-user-2",
  "farmSize": 15,
  "location": {
    "state": "Maharashtra",
    "district": "Pune"
  },
  "primaryCrops": ["wheat"]
}'

RESPONSE_2=$(curl -s -X POST \
  "${API_BASE_URL}/schemes/check-eligibility" \
  -H "Content-Type: application/json" \
  -d "{
    \"schemeId\": \"pm-kisan-2024\",
    \"userProfile\": $TEST_PROFILE_2
  }")

echo "Scheme: PM-KISAN"
echo "Response: $RESPONSE_2"
echo ""

if echo "$RESPONSE_2" | grep -q '"isEligible":false'; then
  echo "✓ Test Case 2 Passed: User is correctly marked as ineligible"
else
  echo "✗ Test Case 2 Failed: User should be ineligible (farm size exceeds limit)"
fi

echo ""

# Test Case 3: Farmer in different state (should not be eligible for state-specific schemes)
echo "Test Case 3: Farmer in different state"
echo "---------------------------------------"

TEST_PROFILE_3='{
  "userId": "test-user-3",
  "farmSize": 2,
  "location": {
    "state": "Karnataka",
    "district": "Bangalore"
  },
  "primaryCrops": ["rice"]
}'

RESPONSE_3=$(curl -s -X POST \
  "${API_BASE_URL}/schemes/check-eligibility" \
  -H "Content-Type: application/json" \
  -d "{
    \"schemeId\": \"pmfby-2024\",
    \"userProfile\": $TEST_PROFILE_3
  }")

echo "Scheme: PMFBY (Maharashtra-specific)"
echo "Response: $RESPONSE_3"
echo ""

if echo "$RESPONSE_3" | grep -q '"isEligible":false'; then
  echo "✓ Test Case 3 Passed: User is correctly marked as ineligible (wrong state)"
else
  echo "✗ Test Case 3 Failed: User should be ineligible (scheme not available in Karnataka)"
fi

echo ""
echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
