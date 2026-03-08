# SNS Topics for alerts and notifications

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"
  
  tags = {
    Name = "${var.project_name}-alerts"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# SNS Topic for CloudWatch Alarms
resource "aws_sns_topic" "cloudwatch_alarms" {
  name = "${var.project_name}-cloudwatch-alarms-${var.environment}"
  
  tags = {
    Name = "${var.project_name}-cloudwatch-alarms"
  }
}

resource "aws_sns_topic_subscription" "cloudwatch_alarms_email" {
  topic_arn = aws_sns_topic.cloudwatch_alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
