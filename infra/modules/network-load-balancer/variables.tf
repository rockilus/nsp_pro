variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the NLB will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the NLB"
  type        = list(string)
}

variable "backend_port" {
  description = "Port for backend services"
  type        = number
  default     = 8000
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the NLB"
  type        = list(string)
  default     = ["10.0.0.0/8"]
}

variable "vpc_cidr_blocks" {
  description = "VPC CIDR blocks for internal communication"
  type        = list(string)
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

