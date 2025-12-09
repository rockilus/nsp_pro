output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.main.id
}

output "user_pool_endpoint" {
  description = "Endpoint name of the user pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "user_pool_domain" {
  description = "Domain name of the user pool"
  value       = aws_cognito_user_pool.main.domain
}

output "cognito_hosted_ui_url" {
  description = "URL of the Cognito hosted UI"
  value       = var.custom_domain_name != null ? "https://${var.custom_domain_name}" : null
}

output "cognito_domain" {
  description = "Cognito domain name (custom or AWS-managed)"
  value       = var.custom_domain_name != null ? var.custom_domain_name : null
}

output "cognito_cloudfront_distribution" {
  description = "CloudFront distribution for custom domain (if applicable)"
  value       = var.custom_domain_name != null ? aws_cognito_user_pool_domain.main[0].cloudfront_distribution : null
}

