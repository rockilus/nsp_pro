# DEPRECATED: SQS permissions now in ecs_sqs_policy.tf attached directly to task execution role

# # Main service task role
# resource "aws_iam_role" "main_service_task_role" {
#   name        = "${var.project_name}-${var.environment}-main-service-task-role"
#   description = "Allows main service ECS tasks to call AWS services on your behalf."
# 
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "ecs-tasks.amazonaws.com"
#         }
#       }
#     ]
#   })
# 
#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-main-service-task-role"
#     Component   = "IAM"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "MainServiceTaskRole"
#   })
# }

# # Solve service task role
# resource "aws_iam_role" "solve_service_task_role" {
#   name        = "${var.project_name}-${var.environment}-solve-service-task-role"
#   description = "Allows solve service ECS tasks to call AWS services on your behalf."
#
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "ecs-tasks.amazonaws.com"
#         }
#       }
#     ]
#   })
#
#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-solve-service-task-role"
#     Component   = "IAM"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "SolveServiceTaskRole"
#   })
# }

# # SQS permissions for main service to send messages
# resource "aws_iam_policy" "main_service_sqs_policy" {
#   name        = "${var.project_name}-${var.environment}-main-service-sqs-policy"
#   description = "Allow main service to send SQS messages"
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "sqs:SendMessage",
#           "sqs:GetQueueUrl",
#           "sqs:GetQueueAttributes"
#         ]
#         Resource = var.solve_queue_arn != "" ? var.solve_queue_arn : "*"
#       }
#     ]
#   })
#
#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-main-service-sqs-policy"
#     Component   = "IAM"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "MainServiceSQSAccess"
#   })
# }

# # SQS permissions for solve service to receive and process messages
# resource "aws_iam_policy" "solve_service_sqs_policy" {
#   name        = "${var.project_name}-${var.environment}-solve-service-sqs-policy"
#   description = "Allow solve service to process SQS messages"
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "sqs:ReceiveMessage",
#           "sqs:DeleteMessage",
#           "sqs:GetQueueUrl",
#           "sqs:GetQueueAttributes",
#           "sqs:ChangeMessageVisibility"
#         ]
#         Resource = var.solve_queue_arn != "" ? var.solve_queue_arn : "*"
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "sqs:SendMessage",
#           "sqs:GetQueueUrl",
#           "sqs:GetQueueAttributes"
#         ]
#         Resource = var.solve_dlq_arn != "" ? var.solve_dlq_arn : "*"
#       }
#     ]
#   })
#
#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-solve-service-sqs-policy"
#     Component   = "IAM"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "SolveServiceSQSAccess"
#   })
# }

# # Attach SQS policies to respective ECS task roles
# resource "aws_iam_role_policy_attachment" "main_service_sqs_policy_attachment" {
#   role       = aws_iam_role.main_service_task_role.name
#   policy_arn = aws_iam_policy.main_service_sqs_policy.arn
# }
#
# resource "aws_iam_role_policy_attachment" "solve_service_sqs_policy_attachment" {
#   role       = aws_iam_role.solve_service_task_role.name
#   policy_arn = aws_iam_policy.solve_service_sqs_policy.arn
# }
