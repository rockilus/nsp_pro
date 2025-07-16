output "api_endpoint" {
  description = "The invocation URL for the API Gateway."
  value       = aws_api_gateway_rest_api.main.endpoint_configuration
}

output "api_id" {
  description = "The ID of the API Gateway."
  value       = aws_api_gateway_rest_api.main.id
}

output "backend_api_key_parameter" {
  description = "Reference to the backend API key SSM parameter"
  value       = aws_ssm_parameter.backend_api_key
}
