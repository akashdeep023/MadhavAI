# SNS SMS Configuration for OTP delivery

# CloudWatch alarm for SMS spending
resource "aws_cloudwatch_metric_alarm" "sms_spending" {
  alarm_name          = "${var.project_name}-sms-spending-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SMSMonthToDateSpentUSD"
  namespace           = "AWS/SNS"
  period              = 3600
  statistic           = "Maximum"
  threshold           = 10  # Alert if spending exceeds $10
  alarm_description   = "Alert when SMS spending exceeds threshold"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  treat_missing_data  = "notBreaching"
}

# Output SMS spending for monitoring
output "sms_configuration_note" {
  value = <<-EOT
    SNS SMS Configuration:
    - Ensure SNS is in Production mode for sending OTP to users
    - Set monthly spending limit: aws sns set-sms-attributes --attributes MonthlySpendLimit=50
    - Set SMS type: aws sns set-sms-attributes --attributes DefaultSMSType=Transactional
    - Monitor spending in CloudWatch Metrics: AWS/SNS → SMSMonthToDateSpentUSD
  EOT
  description = "Instructions for SNS SMS configuration"
}
