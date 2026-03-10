# Disaster Recovery and Backup Configuration
# RTO: 1 hour, RPO: 5 minutes

# ============================================================================
# DynamoDB Backup Configuration
# ============================================================================

# Automated backup plan for DynamoDB tables
resource "aws_backup_vault" "dynamodb_vault" {
  name = "${var.project_name}-dynamodb-backup-vault"
  
  tags = {
    Name = "${var.project_name}-dynamodb-backup-vault"
  }
}

resource "aws_backup_plan" "dynamodb_backup" {
  name = "${var.project_name}-dynamodb-backup-plan"
  
  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = "cron(0 2 * * ? *)" # Daily at 2 AM UTC
    
    lifecycle {
      delete_after = 30 # Keep backups for 30 days
    }
    
    recovery_point_tags = {
      BackupType = "Daily"
    }
  }
  
  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = "cron(0 3 ? * SUN *)" # Weekly on Sunday at 3 AM UTC
    
    lifecycle {
      delete_after = 90 # Keep weekly backups for 90 days
    }
    
    recovery_point_tags = {
      BackupType = "Weekly"
    }
  }
  
  tags = {
    Name = "${var.project_name}-dynamodb-backup-plan"
  }
}

# IAM role for AWS Backup
resource "aws_iam_role" "backup_role" {
  name = "${var.project_name}-backup-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "restore_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Backup selection for all DynamoDB tables
resource "aws_backup_selection" "dynamodb_selection" {
  name         = "${var.project_name}-dynamodb-selection"
  plan_id      = aws_backup_plan.dynamodb_backup.id
  iam_role_arn = aws_iam_role.backup_role.arn
  
  resources = [
    aws_dynamodb_table.users.arn,
    aws_dynamodb_table.crop_plans.arn,
    aws_dynamodb_table.schemes.arn,
    aws_dynamodb_table.market_prices.arn,
    aws_dynamodb_table.alerts.arn,
    aws_dynamodb_table.training_lessons.arn
  ]
}

# ============================================================================
# S3 Backup Configuration
# ============================================================================

# S3 Backup Vault
resource "aws_backup_vault" "s3_vault" {
  name = "${var.project_name}-s3-backup-vault"
  
  tags = {
    Name = "${var.project_name}-s3-backup-vault"
  }
}

resource "aws_backup_plan" "s3_backup" {
  name = "${var.project_name}-s3-backup-plan"
  
  rule {
    rule_name         = "daily_s3_backup"
    target_vault_name = aws_backup_vault.s3_vault.name
    schedule          = "cron(0 4 * * ? *)" # Daily at 4 AM UTC
    
    lifecycle {
      delete_after = 30
    }
    
    recovery_point_tags = {
      BackupType = "Daily"
    }
  }
  
  tags = {
    Name = "${var.project_name}-s3-backup-plan"
  }
}

resource "aws_backup_selection" "s3_selection" {
  name         = "${var.project_name}-s3-selection"
  plan_id      = aws_backup_plan.s3_backup.id
  iam_role_arn = aws_iam_role.backup_role.arn
  
  resources = [
    aws_s3_bucket.content.arn,
    aws_s3_bucket.backup.arn
  ]
}

# ============================================================================
# Cross-Region Backup Replication
# ============================================================================

# Backup vault in backup region
resource "aws_backup_vault" "backup_region_vault" {
  provider = aws.backup
  name     = "${var.project_name}-backup-region-vault"
  
  tags = {
    Name = "${var.project_name}-backup-region-vault"
  }
}

# Copy backups to backup region
resource "aws_backup_vault_policy" "backup_region_policy" {
  provider          = aws.backup
  backup_vault_name = aws_backup_vault.backup_region_vault.name
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossRegionBackup"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "backup:CopyIntoBackupVault"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# Automated Failover Configuration
# ============================================================================

# NOTE: Failover Lambda function commented out - requires custom implementation
# Uncomment and create lambda/failover-handler.zip when ready to implement automated failover

# Lambda function for automated failover
# resource "aws_lambda_function" "failover_handler" {
#   filename      = "${path.module}/../../dist/lambda/failover-handler.zip"
#   function_name = "${var.project_name}-failover-handler"
#   role          = aws_iam_role.failover_lambda_role.arn
#   handler       = "index.handler"
#   runtime       = var.lambda_runtime
#   timeout       = 300 # 5 minutes for failover operations
#   
#   environment {
#     variables = {
#       PRIMARY_REGION = var.primary_region
#       BACKUP_REGION  = var.backup_region
#       PROJECT_NAME   = var.project_name
#       ENVIRONMENT    = var.environment
#     }
#   }
#   
#   tags = {
#     Name = "${var.project_name}-failover-handler"
#   }
# }

# IAM role for failover Lambda
resource "aws_iam_role" "failover_lambda_role" {
  name = "${var.project_name}-failover-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "failover_lambda_policy" {
  name = "${var.project_name}-failover-lambda-policy"
  role = aws_iam_role.failover_lambda_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:GetHealthCheckStatus",
          "route53:GetChange"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:UpdateTable",
          "dynamodb:DescribeGlobalTable"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.cloudwatch_alarms.arn
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Event Rule to trigger failover on health check failure
# resource "aws_cloudwatch_event_rule" "failover_trigger" {
#   name        = "${var.project_name}-failover-trigger"
#   description = "Trigger automated failover when primary region fails"
#   
#   event_pattern = jsonencode({
#     source      = ["aws.cloudwatch"]
#     detail-type = ["CloudWatch Alarm State Change"]
#     detail = {
#       alarmName = [aws_cloudwatch_metric_alarm.primary_api_health.alarm_name]
#       state = {
#         value = ["ALARM"]
#       }
#     }
#   })
# }

# resource "aws_cloudwatch_event_target" "failover_lambda" {
#   rule      = aws_cloudwatch_event_rule.failover_trigger.name
#   target_id = "FailoverLambda"
#   arn       = aws_lambda_function.failover_handler.arn
# }

# resource "aws_lambda_permission" "allow_cloudwatch_failover" {
#   statement_id  = "AllowExecutionFromCloudWatch"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.failover_handler.function_name
#   principal     = "events.amazonaws.com"
#   source_arn    = aws_cloudwatch_event_rule.failover_trigger.arn
# }

# ============================================================================
# Monitoring and Alerting for DR
# ============================================================================

# CloudWatch Dashboard for DR metrics
resource "aws_cloudwatch_dashboard" "disaster_recovery" {
  dashboard_name = "${var.project_name}-disaster-recovery"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Route53", "HealthCheckStatus", { stat = "Minimum" }],
            ["AWS/DynamoDB", "UserErrors", { stat = "Sum" }],
            ["AWS/Lambda", "Errors", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.primary_region
          title  = "System Health Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/S3", "ReplicationLatency", { stat = "Average" }],
            ["AWS/DynamoDB", "ReplicationLatency", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.primary_region
          title  = "Replication Metrics"
        }
      }
    ]
  })
}

# Alarm for backup failures
resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "${var.project_name}-backup-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 3600
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when backup jobs fail"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
}

# Alarm for replication lag
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "${var.project_name}-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Average"
  threshold           = 900000 # 15 minutes in milliseconds
  alarm_description   = "Alert when S3 replication lag exceeds 15 minutes"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  
  dimensions = {
    SourceBucket      = aws_s3_bucket.content.id
    DestinationBucket = aws_s3_bucket.content_backup_region.id
  }
}

# ============================================================================
# Recovery Testing Automation
# ============================================================================

# NOTE: DR test Lambda function commented out - requires custom implementation
# Uncomment and create lambda/dr-test.zip when ready to implement automated DR testing

# Lambda function for automated DR testing
# resource "aws_lambda_function" "dr_test" {
#   filename      = "${path.module}/../../dist/lambda/dr-test.zip"
#   function_name = "${var.project_name}-dr-test"
#   role          = aws_iam_role.dr_test_lambda_role.arn
#   handler       = "index.handler"
#   runtime       = var.lambda_runtime
#   timeout       = 300
#   
#   environment {
#     variables = {
#       PRIMARY_REGION = var.primary_region
#       BACKUP_REGION  = var.backup_region
#       PROJECT_NAME   = var.project_name
#       ENVIRONMENT    = var.environment
#     }
#   }
#   
#   tags = {
#     Name = "${var.project_name}-dr-test"
#   }
# }

# IAM role for DR test Lambda
resource "aws_iam_role" "dr_test_lambda_role" {
  name = "${var.project_name}-dr-test-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "dr_test_lambda_policy" {
  name = "${var.project_name}-dr-test-lambda-policy"
  role = aws_iam_role.dr_test_lambda_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject"
        ]
        Resource = [
          aws_s3_bucket.content.arn,
          "${aws_s3_bucket.content.arn}/*",
          aws_s3_bucket.content_backup_region.arn,
          "${aws_s3_bucket.content_backup_region.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "backup:DescribeBackupVault",
          "backup:ListRecoveryPointsByBackupVault"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.cloudwatch_alarms.arn
      }
    ]
  })
}

# Schedule monthly DR tests
# resource "aws_cloudwatch_event_rule" "dr_test_schedule" {
#   name                = "${var.project_name}-dr-test-schedule"
#   description         = "Monthly disaster recovery test"
#   schedule_expression = "cron(0 10 1 * ? *)" # First day of month at 10 AM UTC
# }

# resource "aws_cloudwatch_event_target" "dr_test_lambda" {
#   rule      = aws_cloudwatch_event_rule.dr_test_schedule.name
#   target_id = "DRTestLambda"
#   arn       = aws_lambda_function.dr_test.arn
# }

# resource "aws_lambda_permission" "allow_cloudwatch_dr_test" {
#   statement_id  = "AllowExecutionFromCloudWatch"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.dr_test.function_name
#   principal     = "events.amazonaws.com"
#   source_arn    = aws_cloudwatch_event_rule.dr_test_schedule.arn
# }
