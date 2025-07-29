# Variables for AWS Secrets Manager module

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, staging, dev)"
  type        = string
}

variable "aws_region" {
  description = "Primary AWS region"
  type        = string
}

variable "replica_region" {
  description = "Secondary AWS region for secret replication"
  type        = string
  default     = "us-west-2"
}

# Secret Values
variable "permit_api_key" {
  description = "Permit.io API key for authorization service"
  type        = string
  sensitive   = true
}

variable "st_api_key" {
  description = "SendGrid API key for email notifications"
  type        = string
  sensitive   = true
}

variable "st_connection_uri" {
  description = "SendGrid connection URI for email service"
  type        = string
  sensitive   = true
}

variable "atlas_connection_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
}

variable "atlas_username" {
  description = "MongoDB Atlas username"
  type        = string
  sensitive   = true
}

variable "atlas_password" {
  description = "MongoDB Atlas password"
  type        = string
  sensitive   = true
}

variable "atlas_database_name" {
  description = "MongoDB Atlas database name"
  type        = string
  default     = "nsp_pro"
}

# KMS Configuration
variable "kms_key_id" {
  description = "KMS key ID for encryption in primary region"
  type        = string
  default     = "alias/aws/secretsmanager"
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption in primary region"
  type        = string
  default     = ""
}

variable "replica_kms_key_id" {
  description = "KMS key ID for encryption in replica region"
  type        = string
  default     = "alias/aws/secretsmanager"
}

variable "replica_kms_key_arn" {
  description = "KMS key ARN for encryption in replica region"
  type        = string
  default     = ""
}

# Recovery and Retention Configuration
variable "recovery_window_in_days" {
  description = "Number of days to retain secrets for recovery (healthcare compliance requires 30+ days)"
  type        = number
  default     = 30

  validation {
    condition     = var.recovery_window_in_days >= 7 && var.recovery_window_in_days <= 30
    error_message = "Recovery window must be between 7 and 30 days for healthcare compliance."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days for audit logs"
  type        = number
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

# Tags
variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}
