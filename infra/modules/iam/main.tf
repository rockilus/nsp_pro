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

# Attach SQS permissions to the task execution role
resource "aws_iam_role_policy_attachment" "ecs_task_execution_sqs_policy_attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.ecs_task_execution_sqs_policy.arn
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
        Resource = compact([
          var.documentdb_secret_arn,
          # optionally include impersonation JWT secret ARN when provided
          var.impersonation_jwt_secret_arn,
        ])
      }
    ]
  })
}

# Add policy for Cognito Admin API access (server-side auth operations)
resource "aws_iam_role_policy" "cognito_admin_auth_policy" {
  name = "${var.project_name}-${var.environment}-cognito-admin-auth-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword",
          "cognito-idp:SignUp",
          "cognito-idp:ConfirmSignUp",
          "cognito-idp:ResendConfirmationCode"
        ]
        Resource = var.cognito_user_pool_arn != "" ? var.cognito_user_pool_arn : "*"
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
