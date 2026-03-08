# CloudWatch Monitoring and Alerting Configuration

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Total Invocations" }],
            [".", "Errors", { stat = "Sum", label = "Errors" }],
            [".", "Duration", { stat = "Average", label = "Avg Duration" }],
            [".", "Throttles", { stat = "Sum", label = "Throttles" }]
          ]
          period = 300
          stat   = "Average"
          region = var.primary_region
          title  = "Lambda Metrics"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "API Requests" }],
            [".", "4XXError", { stat = "Sum", label = "4XX Errors" }],
            [".", "5XXError", { stat = "Sum", label = "5XX Errors" }],
            [".", "Latency", { stat = "Average", label = "Latency" }]
          ]
          period = 300
          stat   = "Average"
          region = var.primary_region
          title  = "API Gateway Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum" }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum" }],
            [".", "UserErrors", { stat = "Sum" }],
            [".", "SystemErrors", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.primary_region
          title  = "DynamoDB Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/S3", "NumberOfObjects", { stat = "Average" }],
            [".", "BucketSizeBytes", { stat = "Average" }]
          ]
          period = 86400
          stat   = "Average"
          region = var.primary_region
          title  = "S3 Storage Metrics"
        }
      },
      {
        type = "log"
        properties = {
          query   = "SOURCE '/aws/lambda/${var.project_name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = var.primary_region
          title   = "Recent Errors"
        }
      }
    ]
  })
}

# CloudWatch Alarms for Lambda Functions
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Lambda error rate exceeded threshold"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  treat_missing_data  = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.project_name}-lambda-duration-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 3000
  alarm_description   = "Lambda duration exceeded 3 seconds"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  treat_missing_data  = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${var.project_name}-lambda-throttles-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda throttling detected"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  treat_missing_data  = "notBreaching"
}

# API Gateway Alarms
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.project_name}-api-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5XX error rate exceeded threshold"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
  }
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.project_name}-api-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 3000
  alarm_description   = "API Gateway latency exceeded 3 seconds"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
  }
}

# DynamoDB Alarms
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttle" {
  alarm_name          = "${var.project_name}-dynamodb-read-throttle-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB read throttling detected"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttle" {
  alarm_name          = "${var.project_name}-dynamodb-write-throttle-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB write throttling detected"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_system_errors" {
  alarm_name          = "${var.project_name}-dynamodb-system-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB system errors detected"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
}

# CloudFront Alarms
resource "aws_cloudwatch_metric_alarm" "cloudfront_error_rate" {
  alarm_name          = "${var.project_name}-cloudfront-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "CloudFront 5XX error rate exceeded 5%"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.content.id
  }
}

# Composite Alarm for overall system health
resource "aws_cloudwatch_composite_alarm" "system_health" {
  alarm_name          = "${var.project_name}-system-health-${var.environment}"
  alarm_description   = "Overall system health composite alarm"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  
  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.lambda_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.api_5xx_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.dynamodb_system_errors.alarm_name})"
  ])
}

# CloudWatch Log Insights Queries
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.project_name}-error-analysis"
  
  log_group_names = [
    aws_cloudwatch_log_group.auth.name,
    aws_cloudwatch_log_group.recommendations.name,
    aws_cloudwatch_log_group.schemes.name,
    aws_cloudwatch_log_group.market_prices.name,
    aws_cloudwatch_log_group.alerts.name,
    aws_cloudwatch_log_group.training.name
  ]
  
  query_string = <<-QUERY
    fields @timestamp, @message, @logStream
    | filter @message like /ERROR/
    | stats count() by @logStream
    | sort count desc
  QUERY
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  name = "${var.project_name}-performance-analysis"
  
  log_group_names = [
    aws_cloudwatch_log_group.auth.name,
    aws_cloudwatch_log_group.recommendations.name
  ]
  
  query_string = <<-QUERY
    fields @timestamp, @duration, @requestId
    | filter @type = "REPORT"
    | stats avg(@duration), max(@duration), min(@duration) by bin(5m)
  QUERY
}

# X-Ray Sampling Rule
resource "aws_xray_sampling_rule" "main" {
  count = var.enable_xray ? 1 : 0
  
  rule_name      = "${var.project_name}-sampling-rule"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
}

# CloudWatch Logs Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${var.project_name}-error-count"
  log_group_name = aws_cloudwatch_log_group.auth.name
  pattern        = "[ERROR]"
  
  metric_transformation {
    name      = "ErrorCount"
    namespace = "${var.project_name}/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "recommendation_latency" {
  name           = "${var.project_name}-recommendation-latency"
  log_group_name = aws_cloudwatch_log_group.recommendations.name
  pattern        = "[time, request_id, duration]"
  
  metric_transformation {
    name      = "RecommendationLatency"
    namespace = "${var.project_name}/Application"
    value     = "$duration"
    unit      = "Milliseconds"
  }
}

# EventBridge Rule for scheduled health checks
resource "aws_cloudwatch_event_rule" "health_check" {
  name                = "${var.project_name}-health-check"
  description         = "Trigger health check every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "health_check" {
  rule      = aws_cloudwatch_event_rule.health_check.name
  target_id = "HealthCheckLambda"
  arn       = aws_lambda_function.auth.arn
  
  input = jsonencode({
    action = "health_check"
  })
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check.arn
}
