variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., prod, staging, dev)"
  type        = string
}

variable "lambda_role_arn" {
  description = "ARN of the Lambda execution role that needs read access to templates"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
