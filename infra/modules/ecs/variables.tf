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
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
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

variable "nlb_security_group_ids" {
  description = "List of security group IDs from the Network Load Balancer"
  type        = list(string)
  default     = []
}

variable "main_service_ecr_repository_url" {
  description = "ECR repository URL for the main service"
  type        = string
}

variable "solve_service_ecr_repository_url" {
  description = "ECR repository URL for the solve service"
  type        = string
}

variable "main_service_port" {
  description = "Port number for the main service"
  type        = number
  default     = 8000
}

variable "solve_service_port" {
  description = "Port number for the solve service"
  type        = number
  default     = 8001
}

variable "permit_pdp_port" {
  description = "Port number for the Permit.io PDP service"
  type        = number
  default     = 7000
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

variable "main_service_desired_count" {
  description = "Desired number of main service tasks"
  type        = number
  default     = 2
}

variable "solve_service_desired_count" {
  description = "Desired number of solve service tasks"
  type        = number
  default     = 1
}

variable "permit_pdp_desired_count" {
  description = "Desired number of Permit.io PDP tasks"
  type        = number
  default     = 1
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "permit_api_key" {
  description = "Permit.io API key for PDP configuration"
  type        = string
  sensitive   = true
}


variable "main_service_environment_variables" {
  description = "Environment variables for the main service"
  type        = map(string)
  default     = {}
}

variable "solve_service_environment_variables" {
  description = "Environment variables for the solve service"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
