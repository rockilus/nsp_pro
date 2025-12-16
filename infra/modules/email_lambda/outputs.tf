output "function_arn" {
  description = "ARN of the email processor Lambda function"
  value       = aws_lambda_function.email_processor.arn
}

output "function_name" {
  description = "Name of the email processor Lambda function"
  value       = aws_lambda_function.email_processor.function_name
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.email_processor_lambda_role.arn
}

output "lambda_role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.email_processor_lambda_role.name
}
