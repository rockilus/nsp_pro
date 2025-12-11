variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "aws_region" {
  description = "AWS region for SES resources"
  type        = string
  default     = "eu-west-3"
}

variable "domain_name" {
  description = "Domain name to verify with SES (e.g., rockilus.com)"
  type        = string
}

variable "from_email_address" {
  description = "Email address to verify with SES (e.g., noreply@rockilus.com)"
  type        = string
  default     = ""
}

variable "enable_dkim" {
  description = "Enable DKIM signing for the domain"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to SES resources"
  type        = map(string)
  default     = {}
}
