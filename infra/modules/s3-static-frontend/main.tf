# Main configuration for S3 Static Frontend module
terraform {
  #   required_version = ">= 1.0"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      #   version = "~> 5.0"
    }
  }
}

# Local values for common naming and tagging
locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Module      = "s3-static-frontend"
  })

  bucket_name = "${var.project_name}-frontend-${var.environment}"
}
