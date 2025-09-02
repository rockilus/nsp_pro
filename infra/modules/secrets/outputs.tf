# Outputs for AWS Secrets Manager module

# Secret ARNs for reference by other modules
output "permit_api_key_secret_arn" {
  description = "ARN of the Permit.io API key secret"
  value       = aws_secretsmanager_secret.permit_api_key.arn
}


# Secret names for ECS task definitions
output "permit_api_key_secret_name" {
  description = "Name of the Permit.io API key secret"
  value       = aws_secretsmanager_secret.permit_api_key.name
}


# IAM resources for accessing secrets
# output "secrets_access_policy_arn" {
#   description = "ARN of the IAM policy for accessing secrets"
#   value       = aws_iam_policy.secrets_access.arn
# }

# output "secrets_access_role_arn" {
#   description = "ARN of the IAM role for accessing secrets"
#   value       = aws_iam_role.secrets_access_role.arn
# }

# output "secrets_access_role_name" {
#   description = "Name of the IAM role for accessing secrets"
#   value       = aws_iam_role.secrets_access_role.name
# }

# CloudWatch log group for monitoring
# output "secrets_audit_log_group_name" {
#   description = "Name of the CloudWatch log group for secrets audit"
#   value       = aws_cloudwatch_log_group.secrets_audit.name
# }

# All secret ARNs for bulk operations
output "all_secret_arns" {
  description = "List of all secret ARNs managed by this module"
  value = [
    aws_secretsmanager_secret.permit_api_key.arn,
  ]
}

# Secret management summary for documentation
output "secrets_summary" {
  description = "Summary of all secrets managed by this module"
  value = {
    permit_api_key = {
      name = aws_secretsmanager_secret.permit_api_key.name
      arn  = aws_secretsmanager_secret.permit_api_key.arn
    }
  }
}
