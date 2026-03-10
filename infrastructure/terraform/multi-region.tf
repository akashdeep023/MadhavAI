# Multi-Region Deployment Configuration
# Primary: ap-south-1 (Mumbai)
# Backup: ap-southeast-1 (Singapore)

# DynamoDB Global Tables for multi-region replication (Version 2019.11.21)
# Note: Using aws_dynamodb_table with replica configuration instead of deprecated aws_dynamodb_global_table
# The global table v2 is configured directly in dynamodb.tf with replica blocks

# Global tables v2 (2019.11.21) are configured in dynamodb.tf with replica blocks
# This provides better performance and is the recommended approach

# S3 Bucket in backup region
resource "aws_s3_bucket" "content_backup_region" {
  provider = aws.backup
  bucket   = "${var.project_name}-content-${var.environment}-backup"
  
  tags = {
    Name = "${var.project_name}-content-backup"
  }
}

resource "aws_s3_bucket_versioning" "content_backup_region" {
  provider = aws.backup
  bucket   = aws_s3_bucket.content_backup_region.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "content_backup_region" {
  provider = aws.backup
  bucket   = aws_s3_bucket.content_backup_region.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Cross-region S3 replication IAM role
resource "aws_iam_role" "s3_replication" {
  name = "${var.project_name}-s3-replication-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_replication" {
  name = "${var.project_name}-s3-replication-policy"
  role = aws_iam_role.s3_replication.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.content.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.content.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.content_backup_region.arn}/*"
      }
    ]
  })
}

# S3 Replication Configuration
resource "aws_s3_bucket_replication_configuration" "content" {
  depends_on = [aws_s3_bucket_versioning.content]
  
  role   = aws_iam_role.s3_replication.arn
  bucket = aws_s3_bucket.content.id
  
  rule {
    id     = "replicate-all"
    status = "Enabled"
    
    filter {}
    
    destination {
      bucket        = aws_s3_bucket.content_backup_region.arn
      storage_class = "STANDARD"
      
      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
      
      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }
    
    delete_marker_replication {
      status = "Enabled"
    }
  }
}

# Route53 Health Check for primary region
resource "aws_route53_health_check" "primary_api" {
  fqdn              = replace(replace(aws_api_gateway_stage.main.invoke_url, "https://", ""), "/.*", "")
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  
  tags = {
    Name = "${var.project_name}-primary-health-check"
  }
}

# CloudWatch Alarm for health check
resource "aws_cloudwatch_metric_alarm" "primary_api_health" {
  alarm_name          = "${var.project_name}-primary-api-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Primary API health check failed"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  
  dimensions = {
    HealthCheckId = aws_route53_health_check.primary_api.id
  }
}
