# # SQS infrastructure for solve request processing
# module "sqs" {
#   source = "../../modules/sqs"

#   project_name = var.project_name
#   environment  = var.environment

#   # Configure queue settings for healthcare compliance
#   visibility_timeout_seconds = var.sqs_visibility_timeout
#   max_receive_count          = var.sqs_max_receive_count
#   kms_key_id                 = var.kms_key_id

#   # Service principals that can access the queue
#   service_principal_arns = [
#     module.iam.main_service_task_role_arn,
#     module.iam.solve_service_task_role_arn
#   ]

#   # Alarm actions (e.g., SNS topic ARNs for notifications)
#   alarm_actions = var.sqs_alarm_actions

#   tags = {
#     Environment = var.environment
#     Owner       = "DevOps Team"
#     Compliance  = "Healthcare"
#     Project     = "NSP Pro"
#   }
# }

# # Create SSM parameters for SQS configuration
# resource "aws_ssm_parameter" "sqs_solve_queue_url" {
#   name        = "/${var.project_name}/${var.environment}/sqs/solve-queue-url"
#   description = "URL for the SQS solve queue"
#   type        = "String"
#   value       = module.sqs.solve_queue_url

#   tags = {
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }
# }

# resource "aws_ssm_parameter" "sqs_solve_queue_name" {
#   name        = "/${var.project_name}/${var.environment}/sqs/solve-queue-name"
#   description = "Name of the SQS solve queue"
#   type        = "String"
#   value       = module.sqs.solve_queue_name

#   tags = {
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }
# }

# resource "aws_ssm_parameter" "sqs_solve_dlq_name" {
#   name        = "/${var.project_name}/${var.environment}/sqs/solve-dlq-name"
#   description = "Name of the SQS solve dead-letter queue"
#   type        = "String"
#   value       = module.sqs.solve_dlq_name

#   tags = {
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }
# }
