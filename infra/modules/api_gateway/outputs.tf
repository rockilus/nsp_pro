output "api_endpoint" {
  description = "The invocation URL for the API Gateway."
  value       = aws_api_gateway_rest_api.main.endpoint_configuration
}

output "api_id" {
  description = "The ID of the API Gateway."
  value       = aws_api_gateway_rest_api.main.id
}
