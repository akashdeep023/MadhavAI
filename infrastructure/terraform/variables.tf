# Variables for Terraform configuration

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "ap-south-1" # Mumbai
}

variable "backup_region" {
  description = "Backup AWS region for disaster recovery"
  type        = string
  default     = "ap-southeast-1" # Singapore
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "farmer-platform"
}

variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "api_throttle_rate" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 1000
}

variable "api_throttle_burst" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 2000
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_200" # Asia, Europe, North America
}

variable "s3_lifecycle_days" {
  description = "Days before transitioning to Glacier"
  type        = number
  default     = 90
}

variable "alert_email" {
  description = "Email for CloudWatch alerts"
  type        = string
}

variable "xray_tracing_mode" {
  description = "X-Ray tracing mode for Lambda functions: Active (trace all) or PassThrough (respect sampling rules)"
  type        = string
  default     = "PassThrough"
}

variable "enable_xray" {
  description = "Enable AWS X-Ray tracing"
  type        = bool
  default     = false
}
