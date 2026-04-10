variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., prod, staging, dev)"
  type        = string
}

variable "visibility_timeout_seconds" {
  description = "Visibility timeout for messages in the queue (time for Lambda to process)"
  type        = number
  default     = 60
}

variable "max_receive_count" {
  description = "Maximum number of times a message can be received before sending to DLQ"
  type        = number
  default     = 3
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (leave empty to use AWS managed keys)"
  type        = string
  default     = ""
}

variable "allowed_principal_arns" {
  description = "List of ARNs allowed to access the queues (ECS task execution role, Lambda role)"
  type        = list(string)
}

variable "alarm_actions" {
  description = "List of ARNs for CloudWatch alarm actions (e.g., SNS topics)"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
