variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, dev, staging)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  validation {
    condition     = length(trimspace(var.aws_region)) > 0
    error_message = "aws_region must not be an empty string"
  }
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit AWS account id"
  }
}

variable "vpc_id" {
  description = "VPC ID where ECS resources will be created"
  type        = string
}

variable "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS services"
  type        = list(string)
}

variable "nlb_arn" {
  description = "ARN of the Network Load Balancer"
  type        = string
}

variable "nlb_security_group_ids" {
  description = "List of security group IDs from the Network Load Balancer"
  type        = list(string)
  default     = []
}

# IAM Role ARNs
variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution IAM role"
  type        = string
}

variable "task_execution_role_id" {
  description = "ID of the ECS task execution IAM role"
  type        = string
}

# variable "task_role_arn" {
#   description = "ARN of the ECS task IAM role"
#   type        = string
# }

# variable "nlb_target_group_arn" {
#   description = "ARN of the Network Load Balancer target group"
#   type        = string
# }

variable "main_service_container_name" {
  description = "Name of the container for the main service"
  type        = string
  default     = "backend-image"
}

variable "main_service_ecr_repository_url" {
  description = "ECR repository URL for the main service"
  type        = string
}

variable "solve_service_ecr_repository_url" {
  description = "ECR repository URL for the solve service"
  type        = string
}


# Main service configuration
variable "main_service_environment_variables" {
  description = "List of environment variables for the main service (each item is an object with name and value)"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "main_service_desired_count" {
  description = "Desired number of main service tasks"
  type        = number
  default     = 2
}

variable "main_service_port" {
  description = "Port number for the main service"
  type        = number
  default     = 8000
}


variable "main_service_cpu" {
  description = "CPU units for the main service task"
  type        = number
  default     = 512
}

variable "main_service_memory" {
  description = "Memory (MiB) for the main service task"
  type        = number
  default     = 1024
}

variable "main_service_cpu_architecture" {
  description = "CPU architecture for the main service ECS task runtime platform"
  type        = string
  default     = "ARM64" // Default value
}

variable "main_service_operating_system_family" {
  description = "Operating system family for the main service ECS task runtime platform"
  type        = string
  default     = "LINUX" // Default value
}

# Solve service configuration
variable "solve_service_environment_variables" {
  description = "List of environment variables for the solve service (each item is an object with name and value)"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "solve_service_desired_count" {
  description = "Desired number of solve service tasks"
  type        = number
  default     = 1
}

variable "solve_service_port" {
  description = "Port number for the solve service"
  type        = number
  default     = 8001
}

variable "solve_service_cpu" {
  description = "CPU units for the solve service task"
  type        = number
  default     = 1024
}

variable "solve_service_memory" {
  description = "Memory (MiB) for the solve service task"
  type        = number
  default     = 2048
}

variable "solve_service_cpu_architecture" {
  description = "CPU architecture for the solve service ECS task runtime platform"
  type        = string
  default     = "ARM64" // Default value
}

variable "solve_service_operating_system_family" {
  description = "Operating system family for the solve service ECS task runtime platform"
  type        = string
  default     = "LINUX" // Default value
}

# Permit.io PDP service configuration
variable "permit_pdp_port" {
  description = "Port number for the Permit.io PDP service"
  type        = number
  default     = 7000
}

variable "permit_pdp_cpu" {
  description = "CPU units for the Permit.io PDP task"
  type        = number
  default     = 256
}

variable "permit_pdp_memory" {
  description = "Memory (MiB) for the Permit.io PDP task"
  type        = number
  default     = 512
}

variable "permit_pdp_desired_count" {
  description = "Desired number of Permit.io PDP tasks"
  type        = number
  default     = 1
}

variable "permit_pdp_cpu_architecture" {
  description = "CPU architecture for the Permit.io PDP ECS task runtime platform"
  type        = string
  default     = "ARM64" // Default value
}

variable "permit_pdp_operating_system_family" {
  description = "Operating system family for the Permit.io PDP ECS task runtime platform"
  type        = string
  default     = "LINUX" // Default value
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Secret ARNs for ECS task definitions
variable "permit_api_key_secret_arn" {
  description = "ARN of the Permit.io API key secret"
  type        = string
  default     = ""
}


variable "documentdb_secret_arn" {
  description = "ARN of the DocumentDB credentials secret"
  type        = string
  default     = ""
}

variable "main_service_security_group_id" {
  description = "Security group ID for the main service"
  type        = string
}

variable "solve_service_security_group_id" {
  description = "Security group ID for the solve service"
  type        = string
}

variable "permit_pdp_security_group_id" {
  description = "Security group ID for the Permit PDP service"
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}

# SQS Queue Names
variable "sqs_solve_queue_name" {
  description = "Name of the SQS queue for solve requests"
  type        = string
  default     = ""
}

variable "sqs_solve_dlq_name" {
  description = "Name of the SQS dead-letter queue for solve requests"
  type        = string
  default     = ""
}
