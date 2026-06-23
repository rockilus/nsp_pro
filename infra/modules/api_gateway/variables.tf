variable "project_name" {
  description = "The name of the project."
  type        = string
}

variable "environment" {
  description = "The environment (e.g., 'local', 'prod')."
  type        = string
}

variable "aws_region" {
  description = "The AWS region for the resources."
  type        = string
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS."
  type        = list(string)
}

variable "vpc_link_target_arns" {
  description = "List of target ARNs for the VPC Link."
  type        = list(string)
}

variable "vpc_link_endpoint_url" {
  description = "The endpoint URL for the VPC Link integration."
  type        = string
}

variable "api_gateway_stage_name" {
  description = "Stage name for the API Gateway."
  type        = string
}

# Custom Domain Configuration
variable "custom_domain_name" {
  description = "Custom domain name for the API Gateway (e.g., api.rockilus.com). Leave null to use default AWS domain."
  type        = string
  default     = null

  validation {
    condition     = var.custom_domain_name == null || can(regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.custom_domain_name))
    error_message = "Custom domain name must be a valid domain format for healthcare API security compliance."
  }
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for the custom domain. Required if custom_domain_name is provided."
  type        = string
  default     = null

  validation {
    condition     = var.custom_domain_name == null || (var.certificate_arn != null && can(regex("^arn:aws:acm:", var.certificate_arn)))
    error_message = "A valid ACM certificate ARN is required when using a custom domain for HTTPS security."
  }
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for the custom domain. Required if custom_domain_name is provided."
  type        = string
  default     = null
}

variable "endpoint_type" {
  description = "API Gateway endpoint configuration type"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "EDGE"], var.endpoint_type)
    error_message = "Endpoint type must be REGIONAL or EDGE. REGIONAL is recommended for healthcare applications."
  }
}

variable "task_execution_role_id" {
  description = "ID (name or ARN) of the ECS task execution IAM role that should be granted access to SSM parameters"
  type        = string
  default     = ""
}

variable "enable_apigw_logging" {
  description = "Enable API Gateway access logging and method-level logging (only create CW resources when true)."
  type        = bool
  default     = false
}

variable "apigw_logging_level" {
  description = "Logging level for API Gateway method settings. One of OFF, ERROR, INFO."
  type        = string
  default     = "INFO"
}

variable "apigw_data_trace_enabled" {
  description = "Enable data trace (request/response body) in API Gateway logs. Use with caution for sensitive data."
  type        = bool
  default     = false
}

variable "apigw_enable_xray" {
  description = "Enable X-Ray tracing for the API Gateway stage."
  type        = bool
  default     = false
}
