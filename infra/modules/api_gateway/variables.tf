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

variable "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool."
  type        = string
}

variable "cognito_user_pool_clients_ids" {
  description = "A list of Cognito User Pool Client IDs."
  type        = list(string)
}

variable "vpc_link_id" {
  description = "The ID of the VPC Link."
  type        = string
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
