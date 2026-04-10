variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, dev, staging)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where security groups will be created"
  type        = string
}

variable "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  type        = string
}

variable "main_service_port" {
  description = "Port for the main service"
  type        = number
  default     = 8000
}

variable "solve_service_port" {
  description = "Port for the solve service"
  type        = number
  default     = 8001
}

variable "permit_pdp_port" {
  description = "Port for the Permit PDP service"
  type        = number
  default     = 7000
}

variable "nlb_security_group_id" {
  description = "Security group ID from the Network Load Balancer"
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}
