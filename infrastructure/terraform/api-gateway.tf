# API Gateway REST API

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "Farmer Decision Support Platform API"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway Account (for CloudWatch logging)
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# Resources
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "auth"
}

# Auth sub-resources
resource "aws_api_gateway_resource" "auth_send_otp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "send-otp"
}

resource "aws_api_gateway_resource" "auth_verify_otp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "verify-otp"
}

resource "aws_api_gateway_resource" "auth_refresh_token" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "refresh-token"
}

resource "aws_api_gateway_resource" "auth_logout" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "logout"
}

resource "aws_api_gateway_resource" "recommendations" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "recommendations"
}

resource "aws_api_gateway_resource" "schemes" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "schemes"
}

# Schemes sub-resources
resource "aws_api_gateway_resource" "schemes_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.schemes.id
  path_part   = "{schemeId}"
}

resource "aws_api_gateway_resource" "schemes_check_eligibility" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.schemes.id
  path_part   = "check-eligibility"
}

resource "aws_api_gateway_resource" "schemes_seed" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.schemes.id
  path_part   = "seed"
}

resource "aws_api_gateway_resource" "schemes_schedule_alerts" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.schemes.id
  path_part   = "schedule-deadline-alerts"
}

resource "aws_api_gateway_resource" "market_prices" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "market-prices"
}

resource "aws_api_gateway_resource" "alerts" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "alerts"
}

# Alerts sub-resources
resource "aws_api_gateway_resource" "alerts_schedule" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.alerts.id
  path_part   = "schedule"
}

resource "aws_api_gateway_resource" "alerts_user" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.alerts.id
  path_part   = "user"
}

resource "aws_api_gateway_resource" "alerts_user_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.alerts_user.id
  path_part   = "{userId}"
}

resource "aws_api_gateway_resource" "alerts_process_due" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.alerts.id
  path_part   = "process-due"
}

resource "aws_api_gateway_resource" "alerts_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.alerts.id
  path_part   = "{alertId}"
}

resource "aws_api_gateway_resource" "alerts_id_read" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.alerts_id.id
  path_part   = "read"
}

resource "aws_api_gateway_resource" "training" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "training"
}

# Soil Health resource
resource "aws_api_gateway_resource" "soil_health" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "soil-health"
}

resource "aws_api_gateway_resource" "soil_health_upload" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.soil_health.id
  path_part   = "upload"
}

resource "aws_api_gateway_resource" "soil_health_presigned_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.soil_health_upload.id
  path_part   = "presigned-url"
}

# Soil Health Analysis resources
resource "aws_api_gateway_resource" "soil_health_analyze" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.soil_health.id
  path_part   = "analyze"
}

resource "aws_api_gateway_resource" "soil_health_analysis" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.soil_health.id
  path_part   = "analysis"
}

resource "aws_api_gateway_resource" "soil_health_analysis_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.soil_health_analysis.id
  path_part   = "{analysisId}"
}

# Methods and Integrations for Auth - Send OTP
resource "aws_api_gateway_method" "auth_send_otp_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth_send_otp.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_send_otp_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth_send_otp.id
  http_method             = aws_api_gateway_method.auth_send_otp_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth.invoke_arn
}

# Methods and Integrations for Auth - Verify OTP
resource "aws_api_gateway_method" "auth_verify_otp_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth_verify_otp.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_verify_otp_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth_verify_otp.id
  http_method             = aws_api_gateway_method.auth_verify_otp_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth.invoke_arn
}

# Methods and Integrations for Auth - Refresh Token
resource "aws_api_gateway_method" "auth_refresh_token_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth_refresh_token.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_refresh_token_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth_refresh_token.id
  http_method             = aws_api_gateway_method.auth_refresh_token_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth.invoke_arn
}

# Methods and Integrations for Auth - Logout
resource "aws_api_gateway_method" "auth_logout_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth_logout.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_logout_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth_logout.id
  http_method             = aws_api_gateway_method.auth_logout_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth.invoke_arn
}

# Methods and Integrations for Recommendations
resource "aws_api_gateway_method" "recommendations_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.recommendations.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recommendations_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.recommendations.id
  http_method             = aws_api_gateway_method.recommendations_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.recommendations.invoke_arn
}

# Methods and Integrations for Schemes
resource "aws_api_gateway_method" "schemes_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.schemes.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "schemes_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.schemes.id
  http_method             = aws_api_gateway_method.schemes_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.schemes.invoke_arn
}

resource "aws_api_gateway_method" "schemes_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.schemes_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "schemes_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.schemes_id.id
  http_method             = aws_api_gateway_method.schemes_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.schemes.invoke_arn
}

resource "aws_api_gateway_method" "schemes_check_eligibility_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.schemes_check_eligibility.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "schemes_check_eligibility_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.schemes_check_eligibility.id
  http_method             = aws_api_gateway_method.schemes_check_eligibility_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.schemes.invoke_arn
}

resource "aws_api_gateway_method" "schemes_seed_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.schemes_seed.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "schemes_seed_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.schemes_seed.id
  http_method             = aws_api_gateway_method.schemes_seed_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.schemes.invoke_arn
}

resource "aws_api_gateway_method" "schemes_schedule_alerts_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.schemes_schedule_alerts.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "schemes_schedule_alerts_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.schemes_schedule_alerts.id
  http_method             = aws_api_gateway_method.schemes_schedule_alerts_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.schemes.invoke_arn
}

# Methods and Integrations for Market Prices
resource "aws_api_gateway_method" "market_prices_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.market_prices.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "market_prices_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.market_prices.id
  http_method             = aws_api_gateway_method.market_prices_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.market_prices.invoke_arn
}

# Methods and Integrations for Alerts
resource "aws_api_gateway_method" "alerts_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.alerts.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "alerts_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.alerts.id
  http_method             = aws_api_gateway_method.alerts_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.alerts.invoke_arn
}

resource "aws_api_gateway_method" "alerts_schedule_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.alerts_schedule.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "alerts_schedule_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.alerts_schedule.id
  http_method             = aws_api_gateway_method.alerts_schedule_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.alerts.invoke_arn
}

resource "aws_api_gateway_method" "alerts_user_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.alerts_user_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "alerts_user_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.alerts_user_id.id
  http_method             = aws_api_gateway_method.alerts_user_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.alerts.invoke_arn
}

resource "aws_api_gateway_method" "alerts_process_due_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.alerts_process_due.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "alerts_process_due_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.alerts_process_due.id
  http_method             = aws_api_gateway_method.alerts_process_due_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.alerts.invoke_arn
}

resource "aws_api_gateway_method" "alerts_id_read_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.alerts_id_read.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "alerts_id_read_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.alerts_id_read.id
  http_method             = aws_api_gateway_method.alerts_id_read_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.alerts.invoke_arn
}

resource "aws_api_gateway_method" "alerts_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.alerts_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "alerts_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.alerts_id.id
  http_method             = aws_api_gateway_method.alerts_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.alerts.invoke_arn
}

# Methods and Integrations for Training
resource "aws_api_gateway_method" "training_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.training.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "training_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.training.id
  http_method             = aws_api_gateway_method.training_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.training.invoke_arn
}

# Methods and Integrations for Soil Health - Presigned URL
resource "aws_api_gateway_method" "soil_health_presigned_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.soil_health_presigned_url.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "soil_health_presigned_url_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.soil_health_presigned_url.id
  http_method             = aws_api_gateway_method.soil_health_presigned_url_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.soil_health_upload.invoke_arn
}

# Methods and Integrations for Soil Health - Analyze
resource "aws_api_gateway_method" "soil_health_analyze_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.soil_health_analyze.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "soil_health_analyze_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.soil_health_analyze.id
  http_method             = aws_api_gateway_method.soil_health_analyze_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.soil_analysis.invoke_arn
}

# Methods and Integrations for Soil Health - Get Analysis
resource "aws_api_gateway_method" "soil_health_analysis_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.soil_health_analysis_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "soil_health_analysis_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.soil_health_analysis_id.id
  http_method             = aws_api_gateway_method.soil_health_analysis_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.soil_analysis.invoke_arn
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "recommendations" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.recommendations.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "schemes" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.schemes.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "market_prices" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.market_prices.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "alerts" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alerts.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "training" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.training.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "soil_health_upload" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.soil_health_upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "soil_analysis" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.soil_analysis.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  
  depends_on = [
    aws_api_gateway_integration.auth_send_otp_post,
    aws_api_gateway_integration.auth_verify_otp_post,
    aws_api_gateway_integration.auth_refresh_token_post,
    aws_api_gateway_integration.auth_logout_post,
    aws_api_gateway_integration.recommendations_get,
    aws_api_gateway_integration.schemes_get,
    aws_api_gateway_integration.schemes_id_get,
    aws_api_gateway_integration.schemes_check_eligibility_post,
    aws_api_gateway_integration.schemes_seed_post,
    aws_api_gateway_integration.schemes_schedule_alerts_post,
    aws_api_gateway_integration.market_prices_get,
    aws_api_gateway_integration.alerts_get,
    aws_api_gateway_integration.alerts_schedule_post,
    aws_api_gateway_integration.alerts_user_id_get,
    aws_api_gateway_integration.alerts_process_due_post,
    aws_api_gateway_integration.alerts_id_read_put,
    aws_api_gateway_integration.alerts_id_delete,
    aws_api_gateway_integration.training_get,
    aws_api_gateway_integration.soil_health_presigned_url_post,
    aws_api_gateway_integration.soil_health_analyze_post,
    aws_api_gateway_integration.soil_health_analysis_id_get
  ]
  
  lifecycle {
    create_before_destroy = true
  }
}

# Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment
  
  xray_tracing_enabled = false
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
  
  tags = {
    Name = "${var.project_name}-api-stage"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = 30
}

# Usage Plan and API Key
resource "aws_api_gateway_usage_plan" "main" {
  name = "${var.project_name}-usage-plan-${var.environment}"
  
  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }
  
  throttle_settings {
    rate_limit  = var.api_throttle_rate
    burst_limit = var.api_throttle_burst
  }
}

resource "aws_api_gateway_api_key" "main" {
  name = "${var.project_name}-api-key-${var.environment}"
}

resource "aws_api_gateway_usage_plan_key" "main" {
  key_id        = aws_api_gateway_api_key.main.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.main.id
}
