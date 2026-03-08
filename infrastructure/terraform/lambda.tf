# Lambda Functions

# Authentication Lambda
resource "aws_lambda_function" "auth" {
  filename         = "${path.module}/../../dist/lambda/auth.zip"
  function_name    = "${var.project_name}-auth-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../dist/lambda/auth.zip")
  runtime         = var.lambda_runtime
  memory_size     = var.lambda_memory_size
  timeout         = var.lambda_timeout
  
  environment {
    variables = {
      ENVIRONMENT        = var.environment
      USERS_TABLE        = aws_dynamodb_table.users.name
      SNS_TOPIC_ARN      = aws_sns_topic.alerts.arn
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }
  
  tags = {
    Name = "${var.project_name}-auth"
  }
}

# Recommendation Engine Lambda
resource "aws_lambda_function" "recommendations" {
  filename         = "${path.module}/../../dist/lambda/recommendations.zip"
  function_name    = "${var.project_name}-recommendations-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../dist/lambda/recommendations.zip")
  runtime         = var.lambda_runtime
  memory_size     = 1024
  timeout         = 60
  
  environment {
    variables = {
      ENVIRONMENT        = var.environment
      USERS_TABLE        = aws_dynamodb_table.users.name
      CROP_PLANS_TABLE   = aws_dynamodb_table.crop_plans.name
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }
  
  tags = {
    Name = "${var.project_name}-recommendations"
  }
}

# Schemes Lambda
resource "aws_lambda_function" "schemes" {
  filename         = "${path.module}/../../dist/lambda/schemes.zip"
  function_name    = "${var.project_name}-schemes-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../dist/lambda/schemes.zip")
  runtime         = var.lambda_runtime
  memory_size     = var.lambda_memory_size
  timeout         = var.lambda_timeout
  
  environment {
    variables = {
      ENVIRONMENT     = var.environment
      SCHEMES_TABLE   = aws_dynamodb_table.schemes.name
      USERS_TABLE     = aws_dynamodb_table.users.name
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }
  
  tags = {
    Name = "${var.project_name}-schemes"
  }
}

# Market Prices Lambda
resource "aws_lambda_function" "market_prices" {
  filename         = "${path.module}/../../dist/lambda/market-prices.zip"
  function_name    = "${var.project_name}-market-prices-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../dist/lambda/market-prices.zip")
  runtime         = var.lambda_runtime
  memory_size     = var.lambda_memory_size
  timeout         = var.lambda_timeout
  
  environment {
    variables = {
      ENVIRONMENT         = var.environment
      MARKET_PRICES_TABLE = aws_dynamodb_table.market_prices.name
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }
  
  tags = {
    Name = "${var.project_name}-market-prices"
  }
}

# Alerts Lambda
resource "aws_lambda_function" "alerts" {
  filename         = "${path.module}/../../dist/lambda/alerts.zip"
  function_name    = "${var.project_name}-alerts-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../dist/lambda/alerts.zip")
  runtime         = var.lambda_runtime
  memory_size     = var.lambda_memory_size
  timeout         = var.lambda_timeout
  
  environment {
    variables = {
      ENVIRONMENT   = var.environment
      ALERTS_TABLE  = aws_dynamodb_table.alerts.name
      SNS_TOPIC_ARN = aws_sns_topic.alerts.arn
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }
  
  tags = {
    Name = "${var.project_name}-alerts"
  }
}

# Training Lambda
resource "aws_lambda_function" "training" {
  filename         = "${path.module}/../../dist/lambda/training.zip"
  function_name    = "${var.project_name}-training-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../dist/lambda/training.zip")
  runtime         = var.lambda_runtime
  memory_size     = var.lambda_memory_size
  timeout         = var.lambda_timeout
  
  environment {
    variables = {
      ENVIRONMENT           = var.environment
      TRAINING_LESSONS_TABLE = aws_dynamodb_table.training_lessons.name
      CONTENT_BUCKET        = aws_s3_bucket.content.id
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }
  
  tags = {
    Name = "${var.project_name}-training"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${aws_lambda_function.auth.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "recommendations" {
  name              = "/aws/lambda/${aws_lambda_function.recommendations.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "schemes" {
  name              = "/aws/lambda/${aws_lambda_function.schemes.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "market_prices" {
  name              = "/aws/lambda/${aws_lambda_function.market_prices.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "alerts" {
  name              = "/aws/lambda/${aws_lambda_function.alerts.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "training" {
  name              = "/aws/lambda/${aws_lambda_function.training.function_name}"
  retention_in_days = 30
}
