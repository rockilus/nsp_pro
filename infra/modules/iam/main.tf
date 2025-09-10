terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# IAM Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name        = "${var.project_name}-${var.environment}-ecs-task-execution-role-2"
  description = "Allows ECS tasks to call AWS services on your behalf."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-ecs-task-execution-role"
    Component   = "IAM"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Purpose     = "ECSTaskExecution"
  })
}

# Attach the Amazon ECS task execution role policy
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Add policy for secrets access
resource "aws_iam_role_policy" "secrets_access_policy" {
  name = "${var.project_name}-${var.environment}-secrets-access-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          # Permit API key secret pattern
          "arn:aws:secretsmanager:*:*:secret:${var.project_name}-${var.environment}-permit-api-key-*",
          # DocumentDB credentials secret pattern
          "arn:aws:secretsmanager:*:*:secret:${var.project_name}/${var.environment}/documentdb/credentials-*"
        ]
      }
    ]
  })
}

# IAM Task Role (for application permissions)
# resource "aws_iam_role" "ecs_task_role" {
#   name        = "${var.project_name}-ecs-task-role"
#   description = "Role that the task can assume to access AWS resources."

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

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-ecs-task-role"
#     Component   = "IAM"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "ECSTaskRole"
#   })
# }

# Policy for accessing secrets
# resource "aws_iam_policy" "secrets_access" {
#   name        = "${var.project_name}-${var.environment}-secrets-access"
#   description = "Policy for ECS tasks to access secrets in ${var.environment} environment"

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "secretsmanager:GetSecretValue",
#           "secretsmanager:DescribeSecret"
#         ]
#         Resource = var.secret_arns
#       }
#     ]
#   })

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-secrets-access"
#     PolicyType  = "Secrets Access"
#     Environment = var.environment
#   })
# }

# Attach secrets policy to task role
# resource "aws_iam_role_policy_attachment" "secrets_access_attachment" {
#   role       = aws_iam_role.ecs_task_role.name
#   policy_arn = aws_iam_policy.secrets_access.arn
# }
