variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

# variable "secret_arns" {
#   description = "List of Secret ARNs that ECS tasks should have access to"
#   type        = list(string)
#   default     = []
# }

variable "solve_queue_arn" {
  description = "ARN of the SQS solve queue"
  type        = string
  default     = ""
}

variable "solve_dlq_arn" {
  description = "ARN of the SQS solve dead-letter queue"
  type        = string
  default     = ""
}

variable "secret_arns" {
  description = "List of Secret ARNs that ECS tasks should have access to"
  type        = list(string)
  default     = []
}
