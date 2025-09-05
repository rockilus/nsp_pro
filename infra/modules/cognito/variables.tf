variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "api_gateway_url" {
  description = "API Gateway base URL for the backend service"
  type        = string
}

variable "aws_region" {
  description = "AWS region for SSM parameter access"
  type        = string
}

variable "api_gateway_ssm_parameter" {
  description = "Reference to API Gateway SSM parameter for dependency management"
  type        = any
  default     = null
}

variable "frontend_domain_name" {
  description = "Frontend domain name for Cognito OAuth redirect URLs"
  type        = string
}

variable "landing_page_domain_name" {
  description = "Landing page domain name for Cognito OAuth redirect URLs"
  type        = string
}

variable "cognito_domain_prefix" {
  description = "Domain prefix for Cognito hosted UI"
  type        = string
  default     = null
}

variable "deletion_protection_cognito" {
  description = "Enable deletion protection for the Cognito User Pool"
  type        = string
  default     = "ACTIVE"

  validation {
    condition     = contains(["ACTIVE", "INACTIVE"], var.deletion_protection_cognito)
    error_message = "Deletion protection must be either 'ACTIVE' or 'INACTIVE'."
  }
}
