# Main configuration for S3 Static Frontend module
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local values for common naming and tagging
locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  })

  bucket_name = "${var.project_name}-frontend-${var.environment}"

  # Generate frontend configuration for injection into build
  frontend_config = {
    aws_region                  = var.aws_region
    cognito_user_pool_id        = var.cognito_user_pool_id
    cognito_user_pool_client_id = var.cognito_user_pool_client_id
    cognito_identity_pool_id    = var.cognito_identity_pool_id
    api_gateway_domain          = var.api_gateway_domain
    environment                 = var.environment
  }
}

# SSM Parameter to store frontend configuration
resource "aws_ssm_parameter" "frontend_config" {
  name  = "/${var.project_name}/${var.environment}/frontend/config"
  type  = "String"
  value = jsonencode(local.frontend_config)

  description = "Frontend configuration for ${var.project_name} ${var.environment}"

  tags = local.common_tags
}

# SSM Parameter for CloudFront distribution ID (useful for invalidation)
resource "aws_ssm_parameter" "cloudfront_distribution_id" {
  name  = "/${var.project_name}/${var.environment}/frontend/cloudfront-distribution-id"
  type  = "String"
  value = aws_cloudfront_distribution.frontend.id

  description = "CloudFront distribution ID for ${var.project_name} ${var.environment}"

  tags = local.common_tags
}

# SSM Parameter for S3 bucket name (useful for deployment scripts)
resource "aws_ssm_parameter" "s3_bucket_name" {
  name  = "/${var.project_name}/${var.environment}/frontend/s3-bucket-name"
  type  = "String"
  value = aws_s3_bucket.frontend.id

  description = "S3 bucket name for ${var.project_name} ${var.environment}"

  tags = local.common_tags
}
