variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (prod, dev, staging)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where DocumentDB will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs where DocumentDB will be deployed"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets are required for DocumentDB high availability."
  }
}

variable "allowed_security_group_ids" {
  description = "List of security group IDs allowed to access DocumentDB"
  type        = list(string)
}

variable "master_username" {
  description = "Master username for the DocumentDB cluster"
  type        = string
  default     = "docdbadmin"
}

variable "engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "5.0.0"
}

variable "instance_class" {
  description = "Instance class for DocumentDB cluster instances"
  type        = string
  default     = "db.r5.large"
}

variable "instance_count" {
  description = "Number of instances in the DocumentDB cluster"
  type        = number
  default     = 2
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 15
    error_message = "Instance count must be between 1 and 15."
  }
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days."
  }
}

variable "preferred_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "skip_final_snapshot" {
  description = "Whether to skip final snapshot when deleting the cluster"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (uses default if not specified)"
  type        = string
  default     = null
}

variable "recovery_window_in_days" {
  description = "Number of days to keep secrets after deletion"
  type        = number
  default     = 30
  validation {
    condition     = var.recovery_window_in_days >= 7 && var.recovery_window_in_days <= 30
    error_message = "Recovery window must be between 7 and 30 days."
  }
}

variable "replica_region" {
  description = "AWS region for cross-region secret replication"
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 90
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch Logs retention period."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
