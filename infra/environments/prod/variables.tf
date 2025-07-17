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

variable "api_gateway_domain_name" {
  description = "Custom domain name for the API Gateway (e.g., api.rockilus.com)"
  type        = string
  default     = "api.rockilus.com"

  validation {
    condition     = var.api_gateway_domain_name == null || can(regex("^api\\.", var.api_gateway_domain_name))
    error_message = "API Gateway domain should follow the pattern 'api.domain.com' for security and organization."
  }
}

# DEPRECATED: The following variables are now managed by the Route 53 module
# When frontend_domain_name is provided, these are automatically handled
variable "frontend_certificate_arn" {
  description = "DEPRECATED: SSL certificate ARN is now managed by Route 53 module. Use frontend_domain_name instead."
  type        = string
  default     = null
}

variable "frontend_route53_zone_id" {
  description = "DEPRECATED: Route53 hosted zone ID is now managed by Route 53 module. Use frontend_domain_name instead."
  type        = string
  default     = null
}
