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

variable "ssm_parameter_dependency" {
  description = "Dependency to ensure SSM parameter is created first"
  type        = any
  default     = null
}
