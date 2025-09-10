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
