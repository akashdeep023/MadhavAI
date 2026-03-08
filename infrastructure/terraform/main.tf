# Main Terraform configuration for Farmer Decision Support Platform
# AWS Infrastructure setup with Lambda, API Gateway, DynamoDB, S3, CloudFront

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket         = "farmer-platform-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.primary_region
  
  default_tags {
    tags = {
      Project     = "FarmerDecisionSupport"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "backup"
  region = var.backup_region
  
  default_tags {
    tags = {
      Project     = "FarmerDecisionSupport"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
