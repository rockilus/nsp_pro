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

variable "frontend_domain_name" {
  description = "Custom domain name for the frontend application (e.g., 'rockilus.com'). When provided, Route 53 hosted zone and SSL certificate will be automatically managed."
  type        = string
  default     = null

  validation {
    condition     = var.frontend_domain_name == null || can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.[a-zA-Z]{2,}$", var.frontend_domain_name))
    error_message = "Frontend domain name must be a valid domain format (e.g., 'example.com')."
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
