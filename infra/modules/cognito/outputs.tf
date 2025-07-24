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
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_domain" {
  description = "Cognito domain name"
  value       = aws_cognito_user_pool_domain.main.domain
}

