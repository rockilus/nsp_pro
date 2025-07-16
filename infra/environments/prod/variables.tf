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

variable "frontend_domain_name" {
  description = "Custom domain name for the frontend (optional)"
  type        = string
  default     = null
}

variable "frontend_certificate_arn" {
  description = "SSL certificate ARN for frontend CloudFront (optional)"
  type        = string
  default     = null
}

variable "frontend_route53_zone_id" {
  description = "Route53 hosted zone ID for frontend domain (optional)"
  type        = string
  default     = null
}
