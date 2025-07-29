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

variable "cors_allowed_origins" {
  description = "List of allowed CORS origins."
  type        = list(string)
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

# DEPRECATED: These variables are no longer needed as Cognito is managed by the module
# variable "cognito_user_pool_id" {
#   description = "Cognito User Pool ID."
#   type        = string
# }
# 
# variable "cognito_user_pool_clients_ids" {
#   description = "List of Cognito User Pool Client IDs."
#   type        = list(string)
# }

variable "vpc_link_id" {
  description = "VPC Link ID for API Gateway integration."
  type        = string
}

variable "vpc_link_target_arns" {
  description = "List of target ARNs for the VPC Link."
  type        = list(string)
}

variable "vpc_link_endpoint_url" {
  description = "VPC Link endpoint URL for API Gateway integration."
  type        = string
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

variable "hosted_zone_domain" {
  description = "The root domain for the hosted zone (e.g., rockilus.com)"
  type        = string
  default     = "rockilus.com"

  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.hosted_zone_domain))
    error_message = "Hosted zone domain must be a valid root domain format for healthcare compliance."
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

variable "landing_page_domain_name" {
  description = "Custom domain name for the landing page (e.g., landing.rockilus.com)"
  type        = string
  default     = "www.rockilus.com"

  validation {
    condition     = var.landing_page_domain_name == null || can(regex("^www\\.", var.landing_page_domain_name))
    error_message = "Landing page domain should follow the pattern 'www.domain.com' for security and organization."
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

# Network Load Balancer Configuration
# DEPRECATED: These variables are now provided by the VPC module
# variable "vpc_id" {
#   description = "VPC ID for production environment"
#   type        = string
# }

# variable "private_subnet_ids" {
#   description = "List of private subnet IDs for NLB placement"
#   type        = list(string)
# }

# variable "vpc_cidr_blocks" {
#   description = "CIDR blocks for VPC internal communication"
#   type        = list(string)
#   default     = ["10.0.0.0/16"]

#   validation {
#     condition     = length(var.vpc_cidr_blocks) > 0
#     error_message = "At least one VPC CIDR block must be specified for healthcare security compliance."
#   }
# }

variable "backend_port" {
  description = "Port for backend API services"
  type        = number
  default     = 8000

  validation {
    condition     = var.backend_port > 1024 && var.backend_port < 65536
    error_message = "Backend port must be between 1024 and 65535 for security compliance."
  }
}

variable "backend_instance_ids" {
  description = "EC2 instance IDs running backend services"
  type        = list(string)
  default     = []
}
