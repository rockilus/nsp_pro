# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  # configuration {
  #   execute_command_configuration {
  #     logging = "OVERRIDE"
  #     log_configuration {
  #       cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_cluster.name
  #     }
  #   }
  # }

  # Healthcare compliance - enable container insights
  setting {
    name  = "containerInsights"
    value = "disabled"
    # value = "enabled"
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-cluster"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Purpose     = "ContainerOrchestration"
  # })
}

# CloudWatch Log Group for ECS Cluster
# resource "aws_cloudwatch_log_group" "ecs_cluster" {
#   name              = "/aws/ecs/${var.project_name}-${var.environment}-cluster"
#   retention_in_days = var.log_retention_days

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-cluster-logs"
#     Component   = "CloudWatch"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#   })
# }

# CloudWatch Log Groups for Services
resource "aws_cloudwatch_log_group" "main_service" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-main-service"
  retention_in_days = 0
  # retention_in_days = var.log_retention_days
  log_group_class = "STANDARD"

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-main-service-logs"
  #   Component   = "CloudWatch"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "MainService"
  # })
}

resource "aws_cloudwatch_log_group" "solve_service" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-solve-service"
  retention_in_days = 0
  # retention_in_days = var.log_retention_days
  log_group_class = "STANDARD"

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-solve-service-logs"
  #   Component   = "CloudWatch"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "SolveService"
  # })
}

resource "aws_cloudwatch_log_group" "cerbos_pdp" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-cerbos-pdp"
  retention_in_days = 0
  log_group_class   = "STANDARD"
}


# Grant the task execution role permissions to create log streams and put
# log events specifically for the CloudWatch Log Groups created in this module.
resource "aws_iam_role_policy" "ecs_task_execution_logs" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution-logs"
  role = var.task_execution_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          aws_cloudwatch_log_group.main_service.arn,
          aws_cloudwatch_log_group.solve_service.arn,
          aws_cloudwatch_log_group.cerbos_pdp.arn,
          "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/ecs/main-service:log-stream:",
          "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/ecs/cerbos-pdp:log-stream:",
          "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/ecs/solve-service:log-stream:",
        ]
      }
    ]
  })
}

# IAM Role references
# Using task_execution_role_arn and task_role_arn from the IAM module

# Additional policy for ECR access
# resource "aws_iam_role_policy" "ecs_task_execution_ecr_policy" {
#   name = "${var.project_name}-${var.environment}-ecs-ecr-policy"
#   # Use the task execution role name from the IAM module
#   # role = var.task_execution_role_name

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "ecr:GetAuthorizationToken",
#           "ecr:BatchCheckLayerAvailability",
#           "ecr:GetDownloadUrlForLayer",
#           "ecr:BatchGetImage"
#         ]
#         Resource = "*"
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:PutLogEvents"
#         ]
#         Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/aws/ecs/*"
#       }
#     ]
#   })
# }

# IAM Role for ECS Service
# resource "aws_iam_role" "ecs_service_role" {
#   name        = "${var.project_name}-${var.environment}-ecs-service-role"
#   description = "Role to enable Amazon ECS to manage your cluster."
#   # path        = "/aws-service-role/ecs.amazonaws.com/"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "ecs.amazonaws.com"
#         }
#       }
#     ]
#   })

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-ecs-service-role"
#     Component   = "IAM"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "ECSServiceRole"
#   })
# }

# resource "aws_iam_role_policy_attachment" "ecs_service_role_attachment" {
#   role       = aws_iam_role.ecs_service_role.name
#   policy_arn = "arn:aws:iam::aws:policy/aws-service-role/AmazonECSServiceRolePolicy"
# }

# Service Discovery Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}-${var.environment}-namespace"
  description = "Service discovery namespace for ${var.project_name} ${var.environment}"
  vpc         = var.vpc_id

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-namespace"
  #   Component   = "ServiceDiscovery"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  # })
}

# Service Discovery Service for Main Service
# resource "aws_service_discovery_service" "main_service" {
#   name = "main-service-backend"
#   # name = "main-service"
#   description = "Managed by arn:aws:ecs:eu-west-3:590183915149:service/rockilus-dev-architecture-jun2025/main-service"
#   type        = "HTTP"

#   namespace_id = aws_service_discovery_private_dns_namespace.main.id


#   # dns_config {
#   #   namespace_id = aws_service_discovery_private_dns_namespace.main.id

#   #   dns_records {
#   #     ttl  = 10
#   #     type = "A"
#   #   }

#   #   routing_policy = "MULTIVALUE"
#   # }

#   tags = merge(
#     # var.tags,
#     {
#       AmazonECSManaged = "true"
#       # Name        = "${var.project_name}-${var.environment}-main-service-discovery"
#       # Component   = "ServiceDiscovery"
#       # Environment = var.environment
#       # Project     = var.project_name
#       # ManagedBy   = "Terraform"
#       # Service     = "MainService"
#   })
# }

# Service Discovery Service for Permit PDP
# resource "aws_service_discovery_service" "permit_pdp" {
#   name = "permit-pdp-service"
#   # name = "permit-pdp"
#   description = "Managed by arn:aws:ecs:eu-west-3:590183915149:service/rockilus-dev-architecture-jun2025/permit-pdp"
#   type        = "HTTP"

#   namespace_id = aws_service_discovery_private_dns_namespace.main.id

#   # dns_config {
#   #   namespace_id = aws_service_discovery_private_dns_namespace.main.id

#   #   dns_records {
#   #     ttl  = 10
#   #     type = "A"
#   #   }

#   #   routing_policy = "MULTIVALUE"
#   # }

#   tags = merge(
#     # var.tags,
#     {
#       AmazonECSManaged = "true"
#       # Name        = "${var.project_name}-${var.environment}-permit-pdp-discovery"
#       # Component   = "ServiceDiscovery"
#       # Environment = var.environment
#       # Project     = var.project_name
#       # ManagedBy   = "Terraform"
#       # Service     = "PermitPDP"
#   })
# }
