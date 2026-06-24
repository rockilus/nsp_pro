variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "deletion_protection_cognito_user_pool_aws" {
  description = "Enable deletion protection for the Cognito User Pool"
  type        = string
  default     = "ACTIVE"

  validation {
    condition     = contains(["ACTIVE", "INACTIVE"], var.deletion_protection_cognito_user_pool_aws)
    error_message = "Deletion protection must be either 'ACTIVE' or 'INACTIVE'."
  }
}
