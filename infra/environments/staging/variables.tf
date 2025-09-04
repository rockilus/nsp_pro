# General Configuration
variable "project_name" {
  description = "Name of the project."
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy resources."
  type        = string
}

variable "aws_profile" {
  description = "AWS CLI profile to use."
  type        = string
}

variable "aws_account_id" {
  description = "AWS Account ID (set to dummy value for local)"
  type        = string
}

variable "environment" {
  description = "Environment name (prod, dev, staging)"
  type        = string
}


# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 3
    error_message = "Exactly 3 public subnet CIDR blocks must be provided for high availability."
  }

  validation {
    condition = alltrue([
      for cidr in var.public_subnet_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All public subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

variable "private_subnet_cidrs" {
  description = "List of CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 3
    error_message = "Exactly 3 private subnet CIDR blocks must be provided for high availability."
  }

  validation {
    condition = alltrue([
      for cidr in var.private_subnet_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All private subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

# Cognito Configuration
variable "cognito_domain_prefix" {
  description = "Domain prefix for Cognito hosted UI"
  type        = string
  default     = null
}

variable "landing_page_domain_name" {
  description = "Custom domain name for the landing page (e.g., landing.rockilus.com)"
  type        = string
  default     = "www.rockilus.com"

  validation {
    condition     = var.landing_page_domain_name == null || can(regex("^www\\.", var.landing_page_domain_name))
    error_message = "Landing page domain should follow the pattern 'www.domain.com' for security and organization."
  }
}

# Secrets Configuration Variables
variable "permit_api_key" {
  description = "Permit.io API key for PDP configuration"
  type        = string
  sensitive   = true
}

variable "replica_region" {
  description = "Secondary AWS region for secret replication"
  type        = string
  default     = "us-west-2"
}

variable "recovery_window_in_days" {
  description = "Number of days to retain secrets for recovery"
  type        = number
  default     = 30

  validation {
    condition     = var.recovery_window_in_days >= 7 && var.recovery_window_in_days <= 30
    error_message = "Recovery window must be between 7 and 30 days for compliance."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days for audit logs"
  type        = number
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

# Route 53 and SSL Configuration Variables

variable "hosted_zone_domain" {
  description = "The root domain for the hosted zone (e.g., rockilus.com)"
  type        = string
  default     = "rockilus.com"

  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.hosted_zone_domain))
    error_message = "Hosted zone domain must be a valid root domain format for healthcare compliance."
  }
}

# DNS / Certificate / Health-check configuration
variable "enable_dnssec" {
  description = "Enable DNSSEC for the Route53 hosted zone to provide additional integrity assurances."
  type        = bool
  default     = true
}

variable "enable_certificate_transparency_logging" {
  description = "Enable Certificate Transparency logging for ACM certificates to increase auditability."
  type        = bool
  default     = true
}

variable "enable_query_logging" {
  description = "Enable Route53 query logging for audit and security monitoring."
  type        = bool
  default     = true
}

variable "health_check_regions" {
  description = "List of AWS regions to use for multi-region health checks."
  type        = list(string)
  default     = ["us-east-1", "us-west-2", "eu-west-1"]

  validation {
    condition     = length(var.health_check_regions) >= 1
    error_message = "At least one health check region must be provided."
  }
}

variable "certificate_subject_alternative_names" {
  description = "List of Subject Alternative Names for the SSL certificate (allows wildcard entries like '*.example.com')."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for name in var.certificate_subject_alternative_names : can(regex("^(\\*\\.)?[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", name))
    ])
    error_message = "Each certificate subject alternative name must be a valid domain name; wildcard prefixes ('*.') are allowed."
  }
}

# Network Load Balancer Configuration
variable "backend_port" {
  description = "Port for backend API services"
  type        = number
  default     = 8000

  validation {
    condition     = (var.solve_service_port == 80) || (var.backend_port > 1024 && var.backend_port < 65536)
    error_message = "Backend port must be 80 or between 1024 and 65535 for security compliance."
  }
}

# API Gateway Configuration
variable "cors_allowed_origins" {
  description = "List of allowed CORS origins."
  type        = list(string)
}






variable "api_gateway_stage_name" {
  description = "Stage name for the API Gateway."
  type        = string
}

variable "api_gateway_domain" {
  description = "The API Gateway domain for the healthcare scheduling application"
  type        = string
  default     = "https://api.rockilus.com"

  validation {
    condition     = can(regex("^https://[a-zA-Z0-9.-]+", var.api_gateway_domain))
    error_message = "The API Gateway domain must be a valid HTTPS URL for security compliance."
  }
}



variable "frontend_domain_name" {
  description = "Custom domain name for the frontend application (e.g., app.rockilus.com)"
  type        = string
  default     = "app.rockilus.com"

  validation {
    condition     = var.frontend_domain_name == null || can(regex("^app\\.", var.frontend_domain_name))
    error_message = "Frontend domain should follow the pattern 'app.domain.com' for security and organization."
  }
}



variable "api_gateway_domain_name" {
  description = "Custom domain name for the API Gateway (e.g., api.rockilus.com)"
  type        = string
  default     = "api.rockilus.com"

  validation {
    condition     = var.api_gateway_domain_name == null || can(regex("^api\\.", var.api_gateway_domain_name))
    error_message = "API Gateway domain should follow the pattern 'api.domain.com' for security and organization."
  }
}

variable "cloudfront_price_class" {
  description = "CloudFront price class for the local environment"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.cloudfront_price_class)
    error_message = "Price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }

}




# ECS Configuration Variables
# Main Service Configuration
variable "main_service_environment_variables" {
  description = "Environment variables for the main service"
  type        = map(string)
  default     = {}
}


variable "main_service_desired_count" {
  description = "Desired number of main service tasks"
  type        = number
  default     = 1

  validation {
    condition     = var.main_service_desired_count >= 1 && var.main_service_desired_count <= 10
    error_message = "Main service desired count must be between 1 and 10 for healthcare compliance."
  }
}


variable "main_service_port" {
  description = "Port for the main service"
  type        = number
  default     = 8000

  validation {
    condition     = var.main_service_port > 1024 && var.main_service_port < 65536
    error_message = "Main service port must be between 1024 and 65535 for security compliance."
  }
}

variable "main_service_cpu" {
  description = "CPU units for the main service task"
  type        = number
  default     = 512

  validation {
    condition     = var.main_service_cpu >= 256 && var.main_service_cpu <= 4096
    error_message = "Main service CPU must be between 256 and 4096 units for healthcare compliance."
  }
}

variable "main_service_memory" {
  description = "Memory (MiB) for the main service task"
  type        = number
  default     = 1024

  validation {
    condition     = var.main_service_memory >= 512 && var.main_service_memory <= 8192
    error_message = "Main service memory must be between 512 and 8192 MiB for healthcare compliance."
  }
}

variable "main_service_cpu_architecture" {
  description = "CPU architecture for the main service task"
  type        = string
  default     = "x86_64"

  validation {
    condition     = contains(["x86_64", "ARM64"], var.main_service_cpu_architecture)
    error_message = "Main service CPU architecture must be either 'x86_64' or 'ARM64' for compatibility."
  }
}

variable "main_service_operating_system_family" {
  description = "Operating system family for the main service task"
  type        = string
  default     = "LINUX"

  validation {
    condition     = contains(["LINUX", "WINDOWS"], var.main_service_operating_system_family)
    error_message = "Main service operating system family must be either 'LINUX' or 'WINDOWS' for compatibility."
  }
}

variable "main_service_container_name" {
  description = "Name of the container for the main service"
  type        = string
  default     = "backend-image"

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9_.-]*$", var.main_service_container_name))
    error_message = "Main service container name must be a valid container name (alphanumeric, underscores, periods, and hyphens allowed)."
  }
}

# Solve Service Configuration
variable "solve_service_environment_variables" {
  description = "Environment variables for the solve service"
  type        = map(string)
  default     = {}
}

variable "solve_service_desired_count" {
  description = "Desired number of solve service tasks"
  type        = number
  default     = 1
  validation {
    condition     = var.solve_service_desired_count >= 1 && var.solve_service_desired_count <= 10
    error_message = "Solve service desired count must be between 1 and 10 for healthcare compliance."
  }
}
variable "solve_service_port" {
  description = "Port for the solve service"
  type        = number
  default     = 8000

  validation {
    condition     = (var.solve_service_port == 80) || (var.solve_service_port > 1024 && var.solve_service_port < 65536)
    error_message = "Solve service port must be 80 or between 1024 and 65535 for security compliance."
  }
}

variable "solve_service_cpu" {
  description = "CPU units for the solve service task"
  type        = number
  default     = 1024

  validation {
    condition     = var.solve_service_cpu >= 256 && var.solve_service_cpu <= 4096
    error_message = "Solve service CPU must be between 256 and 4096 units for healthcare compliance."
  }
}

variable "solve_service_memory" {
  description = "Memory (MiB) for the solve service task"
  type        = number
  default     = 2048

  validation {
    condition     = var.solve_service_memory >= 512 && var.solve_service_memory <= 8192
    error_message = "Solve service memory must be between 512 and 8192 MiB for healthcare compliance."
  }
}

variable "solve_service_cpu_architecture" {
  description = "CPU architecture for the solve service task"
  type        = string
  default     = "x86_64"

  validation {
    condition     = contains(["x86_64", "ARM64"], var.solve_service_cpu_architecture)
    error_message = "Solve service CPU architecture must be either 'x86_64' or 'ARM64' for compatibility."
  }
}

variable "solve_service_operating_system_family" {
  description = "Operating system family for the solve service task"
  type        = string
  default     = "LINUX"

  validation {
    condition     = contains(["LINUX", "WINDOWS"], var.solve_service_operating_system_family)
    error_message = "Solve service operating system family must be either 'LINUX' or 'WINDOWS' for compatibility."
  }
}

# Permit PDP Service Configuration
variable "permit_pdp_desired_count" {
  description = "Desired number of Permit PDP tasks"
  type        = number
  default     = 1
  validation {
    condition     = var.permit_pdp_desired_count >= 1 && var.permit_pdp_desired_count <= 10
    error_message = "Permit PDP desired count must be between 1 and 10 for healthcare compliance."
  }
}

variable "permit_pdp_port" {
  description = "Port for the Permit PDP service"
  type        = number
  default     = 3000

  validation {
    condition     = var.permit_pdp_port > 1024 && var.permit_pdp_port < 65536
    error_message = "Permit PDP port must be between 1024 and 65535 for security compliance."
  }
}

variable "permit_pdp_cpu" {
  description = "CPU units for the Permit PDP task"
  type        = number
  default     = 256

  validation {
    condition     = var.permit_pdp_cpu >= 128 && var.permit_pdp_cpu <= 2048
    error_message = "Permit PDP CPU must be between 128 and 2048 units for healthcare compliance."
  }
}

variable "permit_pdp_memory" {
  description = "Memory (MiB) for the Permit PDP task"
  type        = number
  default     = 512

  validation {
    condition     = var.permit_pdp_memory >= 256 && var.permit_pdp_memory <= 4096
    error_message = "Permit PDP memory must be between 256 and 4096 MiB for healthcare compliance."
  }
}

variable "permit_pdp_cpu_architecture" {
  description = "CPU architecture for the Permit PDP task"
  type        = string
  default     = "x86_64"

  validation {
    condition     = contains(["x86_64", "ARM64"], var.permit_pdp_cpu_architecture)
    error_message = "Permit PDP CPU architecture must be either 'x86_64' or 'ARM64' for compatibility."
  }
}

variable "permit_pdp_operating_system_family" {
  description = "Operating system family for the Permit PDP task"
  type        = string
  default     = "LINUX"

  validation {
    condition     = contains(["LINUX", "WINDOWS"], var.permit_pdp_operating_system_family)
    error_message = "Permit PDP operating system family must be either 'LINUX' or 'WINDOWS' for compatibility."
  }
}
