# AWS Secrets Manager module for NSP Pro
# This module manages sensitive configuration data for the healthcare scheduling application

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# Permit.io API Key Secret
resource "aws_secretsmanager_secret" "permit_api_key" {
  name        = "nsp_pro/permit_api_key"
  description = "Permit.io api key"
  #   name        = "${var.project_name}-${var.environment}-permit-api-key"
  #   description             = "Permit.io API key for authorization service in ${var.environment} environment"
  recovery_window_in_days        = var.recovery_window_in_days
  force_overwrite_replica_secret = false


  # Healthcare compliance and security configurations
  #   kms_key_id = var.kms_key_id

  #   replica {
  #     region     = var.replica_region
  #     kms_key_id = var.replica_kms_key_id
  #   }

  #   tags = merge(var.tags, {
  #     Name        = "${var.project_name}-${var.environment}-permit-api-key"
  #     SecretType  = "API Key"
  #     Service     = "Permit.io"
  #     Compliance  = "Healthcare"
  #     Environment = var.environment
  #   })
}

resource "aws_secretsmanager_secret_version" "permit_api_key" {
  secret_id     = aws_secretsmanager_secret.permit_api_key.id
  secret_string = var.permit_api_key

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# SuperTokens API Key Secret
resource "aws_secretsmanager_secret" "st_api_key" {
  name        = "nsp_pro/st_api_key"
  description = "SuperTokens API key"
  #   name                           = "${var.project_name}-${var.environment}-st-api-key"
  #   description                    = "SendGrid API key for email notifications in ${var.environment} environment"
  recovery_window_in_days        = var.recovery_window_in_days
  force_overwrite_replica_secret = false

  # Healthcare compliance and security configurations
  #   kms_key_id = var.kms_key_id

  #   replica {
  #     region     = var.replica_region
  #     kms_key_id = var.replica_kms_key_id
  #   }

  #   tags = merge(var.tags, {
  #     Name        = "${var.project_name}-${var.environment}-st-api-key"
  #     SecretType  = "API Key"
  #     Service     = "SendGrid"
  #     Compliance  = "Healthcare"
  #     Environment = var.environment
  #   })
}

resource "aws_secretsmanager_secret_version" "st_api_key" {
  secret_id     = aws_secretsmanager_secret.st_api_key.id
  secret_string = var.st_api_key

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# SendGrid Connection URI Secret
resource "aws_secretsmanager_secret" "st_connection_uri" {
  name        = "nsp_pro/st_connection_uri"
  description = "SuperTokens connection URI"
  #   name                    = "${var.project_name}-${var.environment}-st-connection-uri"
  #   description             = "SendGrid connection URI for email service in ${var.environment} environment"
  recovery_window_in_days        = var.recovery_window_in_days
  force_overwrite_replica_secret = false

  # Healthcare compliance and security configurations
  #   kms_key_id = var.kms_key_id

  #   replica {
  #     region     = var.replica_region
  #     kms_key_id = var.replica_kms_key_id
  #   }

  #   tags = merge(var.tags, {
  #     Name        = "${var.project_name}-${var.environment}-st-connection-uri"
  #     SecretType  = "Connection URI"
  #     Service     = "SendGrid"
  #     Compliance  = "Healthcare"
  #     Environment = var.environment
  #   })
}

resource "aws_secretsmanager_secret_version" "st_connection_uri" {
  secret_id     = aws_secretsmanager_secret.st_connection_uri.id
  secret_string = var.st_connection_uri

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# MongoDB Atlas Secret
resource "aws_secretsmanager_secret" "atlas_secret" {
  name        = "nsp_pro/atlas_secret"
  description = "URI to atlas db"
  #   name                    = "${var.project_name}-${var.environment}-mongodb-atlas"
  #   description             = "MongoDB Atlas connection credentials for ${var.environment} environment"
  recovery_window_in_days        = var.recovery_window_in_days
  force_overwrite_replica_secret = false

  # Healthcare compliance and security configurations
  #   kms_key_id = var.kms_key_id

  #   replica {
  #     region     = var.replica_region
  #     kms_key_id = var.replica_kms_key_id
  #   }

  #   tags = merge(var.tags, {
  #     Name        = "${var.project_name}-${var.environment}-mongodb-atlas"
  #     SecretType  = "Database Credentials"
  #     Service     = "MongoDB Atlas"
  #     Compliance  = "Healthcare"
  #     Environment = var.environment
  #   })
}

resource "aws_secretsmanager_secret_version" "atlas_secret" {
  secret_id = aws_secretsmanager_secret.atlas_secret.id
  secret_string = jsonencode({
    connection_uri = var.atlas_connection_uri
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# IAM policy for ECS tasks to access secrets
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
#         Resource = [
#           aws_secretsmanager_secret.permit_api_key.arn,
#           aws_secretsmanager_secret.st_api_key.arn,
#           aws_secretsmanager_secret.st_connection_uri.arn,
#           aws_secretsmanager_secret.atlas_secret.arn
#         ]
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "kms:Decrypt",
#           "kms:DescribeKey"
#         ]
#         Resource = [
#           var.kms_key_arn,
#           var.replica_kms_key_arn
#         ]
#         Condition = {
#           StringEquals = {
#             "kms:ViaService" = [
#               "secretsmanager.${var.aws_region}.amazonaws.com",
#               "secretsmanager.${var.replica_region}.amazonaws.com"
#             ]
#           }
#         }
#       }
#     ]
#   })

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-secrets-access"
#     PolicyType  = "Secrets Access"
#     Compliance  = "Healthcare"
#     Environment = var.environment
#   })
# }

# IAM role for ECS tasks to access secrets
# resource "aws_iam_role" "secrets_access_role" {
#   name = "${var.project_name}-${var.environment}-secrets-access-role"

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
#     Name        = "${var.project_name}-${var.environment}-secrets-access-role"
#     RoleType    = "ECS Task Role"
#     Compliance  = "Healthcare"
#     Environment = var.environment
#   })
# }

# resource "aws_iam_role_policy_attachment" "secrets_access" {
#   role       = aws_iam_role.secrets_access_role.name
#   policy_arn = aws_iam_policy.secrets_access.arn
# }

# CloudWatch log group for secrets access monitoring
# resource "aws_cloudwatch_log_group" "secrets_audit" {
#   name              = "/aws/secretsmanager/${var.project_name}-${var.environment}"
#   retention_in_days = var.log_retention_days
#   kms_key_id        = var.kms_key_arn

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-secrets-audit"
#     LogType     = "Secrets Audit"
#     Compliance  = "Healthcare"
#     Environment = var.environment
#   })
# }
