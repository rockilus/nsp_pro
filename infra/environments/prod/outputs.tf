# API Gateway outputs
output "api_gateway_endpoint" {
  description = "Endpoint configuration for the API Gateway"
  value       = module.api_gateway.api_endpoint
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api_gateway.api_id
}

# Cognito outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = module.cognito.user_pool_arn
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "cognito_user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = module.cognito.user_pool_endpoint
}

output "cognito_user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.cognito.user_pool_domain
}

# Frontend outputs
output "frontend_url" {
  description = "Frontend website URL"
  value       = module.frontend.website_url
}

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.frontend.cloudfront_domain_name
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend"
  value       = module.frontend.s3_bucket_id
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.frontend.cloudfront_distribution_id
}

output "frontend_deployment_info" {
  description = "Frontend deployment information"
  value = {
    s3_bucket_name             = module.frontend.s3_bucket_id
    cloudfront_distribution_id = module.frontend.cloudfront_distribution_id
    website_url                = module.frontend.website_url
    deployment_role_arn        = module.frontend.deployment_role_arn
  }
  sensitive = false
}

# SSM Parameter outputs
output "frontend_config_ssm_parameter" {
  description = "SSM parameter containing frontend configuration"
  value       = aws_ssm_parameter.frontend_config.name
}

output "frontend_cloudfront_ssm_parameter" {
  description = "SSM parameter containing CloudFront distribution ID"
  value       = aws_ssm_parameter.frontend_cloudfront_distribution_id.name
}

output "frontend_s3_bucket_ssm_parameter" {
  description = "SSM parameter containing S3 bucket name"
  value       = aws_ssm_parameter.frontend_s3_bucket_name.name
}
