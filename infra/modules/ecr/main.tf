# ECR Repository for Main Service (API Gateway)
resource "aws_ecr_repository" "main_service" {
  name                 = "${var.project_name}-${var.environment}-main-service"
  image_tag_mutability = "MUTABLE"

  # Enable encryption at rest for healthcare compliance
  encryption_configuration {
    encryption_type = "AES256"
  }

  # Image scanning for security compliance
  image_scanning_configuration {
    scan_on_push = false
  }

  # Lifecycle policy to manage images and reduce costs
  #   tags = merge(var.tags, {
  #     Name        = "${var.project_name}-${var.environment}-main-service"
  #     Component   = "ECR"
  #     Service     = "MainService"
  #     Environment = var.environment
  #     Project     = var.project_name
  #     ManagedBy   = "Terraform"
  #     Purpose     = "ContainerRegistry"
  #   })
}

# ECR Repository for Solve Service
resource "aws_ecr_repository" "solve_service" {
  name                 = "${var.project_name}-${var.environment}-solve-service"
  image_tag_mutability = "MUTABLE"

  # Enable encryption at rest for healthcare compliance
  encryption_configuration {
    encryption_type = "AES256"
  }

  # Image scanning for security compliance
  image_scanning_configuration {
    scan_on_push = false
  }

  #   tags = merge(var.tags, {
  #     Name        = "${var.project_name}-${var.environment}-solve-service"
  #     Component   = "ECR"
  #     Service     = "SolveService"
  #     Environment = var.environment
  #     Project     = var.project_name
  #     ManagedBy   = "Terraform"
  #     Purpose     = "ContainerRegistry"
  #   })
}

# Lifecycle Policy for Main Service Repository
# resource "aws_ecr_lifecycle_policy" "main_service" {
#   repository = aws_ecr_repository.main_service.name

#   policy = jsonencode({
#     rules = [
#       {
#         rulePriority = 1
#         description  = "Keep last 30 production images"
#         selection = {
#           tagStatus     = "tagged"
#           tagPrefixList = ["v", "release", "prod"]
#           countType     = "imageCountMoreThan"
#           countNumber   = 30
#         }
#         action = {
#           type = "expire"
#         }
#       },
#       {
#         rulePriority = 2
#         description  = "Keep last 10 development images"
#         selection = {
#           tagStatus     = "tagged"
#           tagPrefixList = ["dev", "staging", "test"]
#           countType     = "imageCountMoreThan"
#           countNumber   = 10
#         }
#         action = {
#           type = "expire"
#         }
#       },
#       {
#         rulePriority = 3
#         description  = "Delete untagged images older than 1 day"
#         selection = {
#           tagStatus   = "untagged"
#           countType   = "sinceImagePushed"
#           countUnit   = "days"
#           countNumber = 1
#         }
#         action = {
#           type = "expire"
#         }
#       }
#     ]
#   })
# }

# Lifecycle Policy for Solve Service Repository
# resource "aws_ecr_lifecycle_policy" "solve_service" {
#   repository = aws_ecr_repository.solve_service.name

#   policy = jsonencode({
#     rules = [
#       {
#         rulePriority = 1
#         description  = "Keep last 30 production images"
#         selection = {
#           tagStatus     = "tagged"
#           tagPrefixList = ["v", "release", "prod"]
#           countType     = "imageCountMoreThan"
#           countNumber   = 30
#         }
#         action = {
#           type = "expire"
#         }
#       },
#       {
#         rulePriority = 2
#         description  = "Keep last 10 development images"
#         selection = {
#           tagStatus     = "tagged"
#           tagPrefixList = ["dev", "staging", "test"]
#           countType     = "imageCountMoreThan"
#           countNumber   = 10
#         }
#         action = {
#           type = "expire"
#         }
#       },
#       {
#         rulePriority = 3
#         description  = "Delete untagged images older than 1 day"
#         selection = {
#           tagStatus   = "untagged"
#           countType   = "sinceImagePushed"
#           countUnit   = "days"
#           countNumber = 1
#         }
#         action = {
#           type = "expire"
#         }
#       }
#     ]
#   })
# }

# Repository Policy for Main Service (Healthcare compliance - restricted access)
# resource "aws_ecr_repository_policy" "main_service" {
#   repository = aws_ecr_repository.main_service.name

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowPull"
#         Effect = "Allow"
#         Principal = {
#           AWS = [
#             "arn:aws:iam::${var.aws_account_id}:root",
#             "arn:aws:iam::${var.aws_account_id}:role/ECS-TaskExecutionRole",
#             "arn:aws:iam::${var.aws_account_id}:role/EC2-ECRAccessRole"
#           ]
#         }
#         Action = [
#           "ecr:GetDownloadUrlForLayer",
#           "ecr:BatchGetImage",
#           "ecr:BatchCheckLayerAvailability"
#         ]
#       },
#       {
#         Sid    = "AllowPushPull"
#         Effect = "Allow"
#         Principal = {
#           AWS = [
#             "arn:aws:iam::${var.aws_account_id}:root"
#           ]
#         }
#         Action = [
#           "ecr:GetDownloadUrlForLayer",
#           "ecr:BatchGetImage",
#           "ecr:BatchCheckLayerAvailability",
#           "ecr:PutImage",
#           "ecr:InitiateLayerUpload",
#           "ecr:UploadLayerPart",
#           "ecr:CompleteLayerUpload"
#         ]
#       }
#     ]
#   })
# }

# Repository Policy for Solve Service (Healthcare compliance - restricted access)
# resource "aws_ecr_repository_policy" "solve_service" {
#   repository = aws_ecr_repository.solve_service.name

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowPull"
#         Effect = "Allow"
#         Principal = {
#           AWS = [
#             "arn:aws:iam::${var.aws_account_id}:root",
#             "arn:aws:iam::${var.aws_account_id}:role/ECS-TaskExecutionRole",
#             "arn:aws:iam::${var.aws_account_id}:role/EC2-ECRAccessRole"
#           ]
#         }
#         Action = [
#           "ecr:GetDownloadUrlForLayer",
#           "ecr:BatchGetImage",
#           "ecr:BatchCheckLayerAvailability"
#         ]
#       },
#       {
#         Sid    = "AllowPushPull"
#         Effect = "Allow"
#         Principal = {
#           AWS = [
#             "arn:aws:iam::${var.aws_account_id}:root"
#           ]
#         }
#         Action = [
#           "ecr:GetDownloadUrlForLayer",
#           "ecr:BatchGetImage",
#           "ecr:BatchCheckLayerAvailability",
#           "ecr:PutImage",
#           "ecr:InitiateLayerUpload",
#           "ecr:UploadLayerPart",
#           "ecr:CompleteLayerUpload"
#         ]
#       }
#     ]
#   })
# }
