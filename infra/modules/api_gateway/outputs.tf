output "api_endpoint" {
  description = "The API Gateway endpoint URL"
  value       = var.custom_domain_name != null ? "https://${var.custom_domain_name}" : "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${var.api_gateway_stage_name}"
}

output "api_id" {
  description = "The ID of the API Gateway."
  value       = aws_api_gateway_rest_api.main.id
}

output "backend_api_key_parameter" {
  description = "Reference to the backend API key SSM parameter"
  value       = aws_ssm_parameter.backend_api_key
}

# Custom Domain Outputs
output "custom_domain_name" {
  description = "The custom domain name for the API Gateway"
  value       = var.custom_domain_name != null ? aws_api_gateway_domain_name.custom[0].domain_name : null
}

output "custom_domain_cloudfront_domain" {
  description = "CloudFront domain name for the custom domain (for DNS configuration)"
  value       = var.custom_domain_name != null ? aws_api_gateway_domain_name.custom[0].cloudfront_domain_name : null
}

output "custom_domain_cloudfront_zone_id" {
  description = "CloudFront zone ID for the custom domain (for DNS configuration)"
  value       = var.custom_domain_name != null ? aws_api_gateway_domain_name.custom[0].cloudfront_zone_id : null
}

output "api_gateway_endpoint_configuration" {
  description = "The endpoint configuration for the API Gateway"
  value       = aws_api_gateway_rest_api.main.endpoint_configuration
}
