# Terraform Outputs

output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_key" {
  description = "API Gateway API Key"
  value       = aws_api_gateway_api_key.main.value
  sensitive   = true
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.content.domain_name
}

output "content_bucket" {
  description = "S3 content bucket name"
  value       = aws_s3_bucket.content.id
}

output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    users            = aws_dynamodb_table.users.name
    crop_plans       = aws_dynamodb_table.crop_plans.name
    schemes          = aws_dynamodb_table.schemes.name
    market_prices    = aws_dynamodb_table.market_prices.name
    alerts           = aws_dynamodb_table.alerts.name
    training_lessons = aws_dynamodb_table.training_lessons.name
  }
}

output "lambda_functions" {
  description = "Lambda function names"
  value = {
    auth             = aws_lambda_function.auth.function_name
    recommendations  = aws_lambda_function.recommendations.function_name
    schemes          = aws_lambda_function.schemes.function_name
    market_prices    = aws_lambda_function.market_prices.function_name
    alerts           = aws_lambda_function.alerts.function_name
    training         = aws_lambda_function.training.function_name
  }
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}
