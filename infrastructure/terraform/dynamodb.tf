# DynamoDB Tables

# Users Table
resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mobileNumber"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "mobileNumber"
    type = "S"
  }
  
  attribute {
    name = "authToken"
    type = "S"
  }
  
  attribute {
    name = "refreshToken"
    type = "S"
  }
  
  # GSI for auth token lookup (used in logout)
  global_secondary_index {
    name            = "AuthTokenIndex"
    hash_key        = "authToken"
    projection_type = "ALL"
  }
  
  # GSI for refresh token lookup (used in token refresh)
  global_secondary_index {
    name            = "RefreshTokenIndex"
    hash_key        = "refreshToken"
    projection_type = "ALL"
  }
  
  # TTL for automatic OTP cleanup
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-users"
  }
}

# Crop Plans Table
resource "aws_dynamodb_table" "crop_plans" {
  name           = "${var.project_name}-crop-plans-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "planId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "planId"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }
  
  attribute {
    name = "status"
    type = "S"
  }
  
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "status"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-crop-plans"
  }
}

# Schemes Table
resource "aws_dynamodb_table" "schemes" {
  name           = "${var.project_name}-schemes-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "schemeId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "schemeId"
    type = "S"
  }
  
  attribute {
    name = "state"
    type = "S"
  }
  
  global_secondary_index {
    name            = "StateIndex"
    hash_key        = "state"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-schemes"
  }
}

# Market Prices Table
resource "aws_dynamodb_table" "market_prices" {
  name           = "${var.project_name}-market-prices-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "priceId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "priceId"
    type = "S"
  }
  
  attribute {
    name = "cropName"
    type = "S"
  }
  
  attribute {
    name = "date"
    type = "S"
  }
  
  global_secondary_index {
    name            = "CropDateIndex"
    hash_key        = "cropName"
    range_key       = "date"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  ttl {
    attribute_name = "expirationTime"
    enabled        = true
  }
  
  tags = {
    Name = "${var.project_name}-market-prices"
  }
}

# Alerts Table
resource "aws_dynamodb_table" "alerts" {
  name           = "${var.project_name}-alerts-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "alertId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "alertId"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }
  
  attribute {
    name = "scheduledTime"
    type = "S"
  }
  
  global_secondary_index {
    name            = "UserScheduledIndex"
    hash_key        = "userId"
    range_key       = "scheduledTime"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  ttl {
    attribute_name = "expirationTime"
    enabled        = true
  }
  
  tags = {
    Name = "${var.project_name}-alerts"
  }
}

# Training Lessons Table
resource "aws_dynamodb_table" "training_lessons" {
  name           = "${var.project_name}-training-lessons-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "lessonId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "lessonId"
    type = "S"
  }
  
  attribute {
    name = "category"
    type = "S"
  }
  
  global_secondary_index {
    name            = "CategoryIndex"
    hash_key        = "category"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-training-lessons"
  }
}

# Soil Health Table
resource "aws_dynamodb_table" "soil_health" {
  name           = "${var.project_name}-soil-health-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }
  
  attribute {
    name = "createdAt"
    type = "S"
  }
  
  global_secondary_index {
    name            = "UserCreatedIndex"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-soil-health"
  }
}
