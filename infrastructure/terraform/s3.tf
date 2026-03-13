# S3 Buckets for content storage

# Content Bucket (videos, images, documents)
resource "aws_s3_bucket" "content" {
  bucket = "${var.project_name}-content-${var.environment}"
  
  tags = {
    Name = "${var.project_name}-content"
  }
}

resource "aws_s3_bucket_versioning" "content" {
  bucket = aws_s3_bucket.content.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  
  rule {
    id     = "archive-old-content"
    status = "Enabled"
    
    filter {}
    
    transition {
      days          = var.s3_lifecycle_days
      storage_class = "GLACIER"
    }
    
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "content" {
  bucket = aws_s3_bucket.content.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "content" {
  comment = "OAI for ${var.project_name} content bucket"
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "content" {
  bucket = aws_s3_bucket.content.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.content.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.content.arn}/*"
      }
    ]
  })
}

# Soil Health Card Images Bucket
resource "aws_s3_bucket" "soil_health_images" {
  bucket = "${var.project_name}-soil-health-images-${var.environment}"
  
  tags = {
    Name = "${var.project_name}-soil-health-images"
  }
}

resource "aws_s3_bucket_versioning" "soil_health_images" {
  bucket = aws_s3_bucket.soil_health_images.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "soil_health_images" {
  bucket = aws_s3_bucket.soil_health_images.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "soil_health_images" {
  bucket = aws_s3_bucket.soil_health_images.id
  
  rule {
    id     = "archive-old-images"
    status = "Enabled"
    
    filter {}
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "soil_health_images" {
  bucket = aws_s3_bucket.soil_health_images.id
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["POST", "PUT", "GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "soil_health_images" {
  bucket = aws_s3_bucket.soil_health_images.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy for Lambda Access
resource "aws_s3_bucket_policy" "soil_health_images" {
  bucket = aws_s3_bucket.soil_health_images.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.soil_health_images.arn}/*"
      },
      {
        Sid    = "AllowLambdaListBucket"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.soil_health_images.arn
      }
    ]
  })
}

# Backup Bucket
resource "aws_s3_bucket" "backup" {
  bucket = "${var.project_name}-backup-${var.environment}"
  
  tags = {
    Name = "${var.project_name}-backup"
  }
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    
    filter {}
    
    expiration {
      days = 30
    }
  }
}
