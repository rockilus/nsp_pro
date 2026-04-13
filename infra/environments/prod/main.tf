# AWS Secrets Manager for sensitive configuration
# The secrets are now managed out-of-band in AWS Secrets Manager.
# Terraform will reference existing secrets via data sources so the
# secret values never enter Terraform state.

# Impersonation JWT secret — this secret is created/managed out-of-band
# (manually or by a separate process). We read it here via a data source
# so Terraform never contains the plaintext value.
data "aws_secretsmanager_secret" "impersonation_jwt" {
  name = var.impersonation_jwt_secret_name
}

data "aws_secretsmanager_secret_version" "impersonation_jwt_version" {
  secret_id = data.aws_secretsmanager_secret.impersonation_jwt.id
}

# Ensure we have an AWS account id available when not provided via terraform.tfvars.
# This falls back to the provider's caller identity if var.aws_account_id is empty.
data "aws_caller_identity" "current" {}

locals {
  effective_aws_account_id = var.aws_account_id != "" ? var.aws_account_id : data.aws_caller_identity.current.account_id
}

# VPC Infrastructure
module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = var.environment

  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}

# ECR repositories for container images
module "ecr" {
  source = "../../modules/ecr"

  project_name   = var.project_name
  environment    = var.environment
  aws_account_id = local.effective_aws_account_id

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}


module "cognito" {
  source = "../../modules/cognito"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  api_gateway_url                           = "https://${var.api_gateway_domain_name}"
  api_gateway_ssm_parameter                 = module.api_gateway.backend_api_key_parameter
  frontend_domain_name                      = var.frontend_domain_name
  landing_page_domain_name                  = var.landing_page_domain_name
  cognito_domain_prefix                     = var.cognito_domain_prefix
  deletion_protection_cognito_user_pool_aws = var.deletion_protection_cognito_user_pool_aws

  # Custom domain configuration
  custom_domain_name = var.cognito_custom_domain_name
  certificate_arn    = module.route53.cloudfront_certificate_arn # Use us-east-1 cert for Cognito
  hosted_zone_id     = module.route53.hosted_zone_id

  depends_on = [module.route53]
}

# AWS SES for email sending
module "ses" {
  source = "../../modules/ses"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  domain_name        = var.ses_domain_name
  from_email_address = var.ses_from_email_address
  enable_dkim        = var.ses_enable_dkim

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}

# IAM roles and policies module
module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  environment  = var.environment

  # Pass secret ARNs so the IAM policy can reference concrete resources
  documentdb_secret_arn        = module.documentdb.credentials_secret_arn
  impersonation_jwt_secret_arn = data.aws_secretsmanager_secret.impersonation_jwt.arn

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}

# SQS infrastructure for solve request processing
module "sqs" {
  source = "../../modules/sqs"

  project_name = var.project_name
  environment  = var.environment

  # Configure queue settings for healthcare compliance
  visibility_timeout_seconds = var.sqs_visibility_timeout
  max_receive_count          = var.sqs_max_receive_count
  kms_key_id                 = var.kms_key_id_sqs

  # Service principals that can access the queue
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  # service_principal_arns = [
  #   module.iam.main_service_task_role_arn,
  #   module.iam.solve_service_task_role_arn
  # ]

  # Alarm actions (e.g., SNS topic ARNs for notifications)
  alarm_actions = var.sqs_alarm_actions

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }

  depends_on = [module.iam]
}

# Email SQS infrastructure for asynchronous email processing
module "email_sqs" {
  source = "../../modules/email_sqs"

  project_name = var.project_name
  environment  = var.environment

  # Configure queue settings
  visibility_timeout_seconds = 60 # Lambda timeout
  max_receive_count          = 3  # Retries before DLQ
  kms_key_id                 = var.kms_key_id_sqs

  # Service principals that can access the queue (API Gateway and Lambda)
  allowed_principal_arns = [
    module.iam.ecs_task_execution_role_arn
  ]

  # Alarm actions (e.g., SNS topic ARNs for notifications)
  alarm_actions = var.sqs_alarm_actions

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
    Purpose     = "Email Processing"
  }

  depends_on = [module.iam]
}

# Lambda function for processing email queue
module "email_lambda" {
  source = "../../modules/email_lambda"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # SQS queue configuration
  sqs_queue_arn = module.email_sqs.email_queue_arn

  # S3 templates bucket (use computed name, bucket created separately)
  s3_templates_bucket_name = "${var.project_name}-${var.environment}-email-templates"
  s3_templates_bucket_arn  = "arn:aws:s3:::${var.project_name}-${var.environment}-email-templates"

  # SES configuration
  ses_from_email        = "noreply@rockilus.com"
  ses_configuration_set = "" # Optional: add if you have SES configuration set

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
    Purpose     = "Email Processing"
  }

  depends_on = [module.email_sqs]
}

# S3 bucket for email templates
module "s3_email_templates" {
  source = "../../modules/s3_email_templates"

  project_name = var.project_name
  environment  = var.environment

  # Lambda role needs read access to templates
  lambda_role_arn = module.email_lambda.lambda_role_arn

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
    Purpose     = "Email Templates"
  }

  depends_on = [module.email_lambda]

  # Supply public logo URL from the public-assets module
  logo_url = module.s3_public_assets.logo_url
}

# Public assets bucket for logos and other public files
module "s3_public_assets" {
  source = "../../modules/s3_public_assets"

  project_name = var.project_name
  environment  = var.environment

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Project     = "NSP Pro"
    Purpose     = "Public Assets"
  }

}

# Route 53 DNS management with SSL certificates
module "route53" {
  source = "../../modules/route53"

  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  project_name = var.project_name
  environment  = var.environment

  domain_name          = var.hosted_zone_domain # Use hosted zone domain, not frontend domain
  frontend_domain_name = var.frontend_domain_name

  # Security enhancements for healthcare compliance
  enable_dnssec                           = var.enable_dnssec
  enable_certificate_transparency_logging = var.enable_certificate_transparency_logging
  enable_query_logging                    = var.enable_query_logging

  # Multi-region health checks for high availability
  health_check_regions = var.health_check_regions

  # SSL certificate with wildcard support for all NSP Pro subdomains
  certificate_subject_alternative_names = var.certificate_subject_alternative_names

  staging_subdomain    = var.staging_subdomain
  staging_name_servers = var.staging_name_servers

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}

# S3 + CloudFront static hosting for the rockilus-web landing page
module "landing_page" {
  source = "../../modules/s3-landing-page"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  domain_name                = var.landing_page_domain_name # www.rockilus.com
  apex_domain_name           = var.hosted_zone_domain       # rockilus.com — apex redirects to www via CloudFront
  cloudfront_certificate_arn = module.route53.cloudfront_certificate_arn
  route53_zone_id            = module.route53.hosted_zone_id
  cloudfront_price_class     = var.cloudfront_price_class

  tags = {
    Environment = var.environment
    Owner       = "Marketing Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
    ManagedBy   = "Terraform"
  }

  depends_on = [module.route53]
}

# Network Load Balancer for API Gateway VPC Link
module "network_load_balancer" {
  source = "../../modules/network-load-balancer"

  project_name = var.project_name
  environment  = var.environment

  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  backend_port            = var.backend_port
  allowed_cidr_blocks     = [module.vpc.vpc_cidr_block]
  vpc_cidr_blocks         = [module.vpc.vpc_cidr_block]
  deletion_protection_nlb = var.deletion_protection_nlb

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }

  depends_on = [module.vpc]
}

# API Gateway for backend services
module "api_gateway" {
  source = "../../modules/api_gateway"

  # General configuration
  project_name   = var.project_name
  environment    = var.environment
  aws_region     = var.aws_region
  aws_account_id = local.effective_aws_account_id

  # API Gateway configuration
  cors_allowed_origins   = var.cors_allowed_origins
  api_gateway_stage_name = var.api_gateway_stage_name

  cognito_user_pool_id          = module.cognito.user_pool_id
  cognito_user_pool_clients_ids = [module.cognito.user_pool_client_id]
  vpc_link_target_arns          = module.network_load_balancer.vpc_link_target_arns
  vpc_link_endpoint_url         = module.network_load_balancer.vpc_link_endpoint_url

  # Custom domain configuration using Route53 module outputs
  custom_domain_name = var.api_gateway_domain_name
  certificate_arn    = module.route53.certificate_arn
  hosted_zone_id     = module.route53.hosted_zone_id

  # Task execution role for accessing SSM parameters
  task_execution_role_id = module.iam.ecs_task_execution_role_id

  # Enable API Gateway logging for staging to help diagnose issues
  enable_apigw_logging     = var.enable_apigw_logging
  apigw_logging_level      = var.apigw_logging_level
  apigw_data_trace_enabled = var.apigw_data_trace_enabled
  apigw_enable_xray        = var.apigw_enable_xray

  depends_on = [
    module.route53,
    module.network_load_balancer,
  ]
}

module "frontend" {
  source = "../../modules/s3-static-frontend"

  project_name                = var.project_name
  environment                 = var.environment
  aws_region                  = var.aws_region
  api_gateway_domain          = var.api_gateway_domain
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_user_pool_client_id = module.cognito.user_pool_client_id

  # Use the specific frontend domain, not derived from hosted zone
  domain_name                = var.frontend_domain_name                  # app.rockilus.com
  certificate_arn            = module.route53.certificate_arn            # Regional certificate (for backward compatibility)
  cloudfront_certificate_arn = module.route53.cloudfront_certificate_arn # CloudFront certificate (US-East-1)
  route53_zone_id            = module.route53.hosted_zone_id

  cloudfront_price_class = var.cloudfront_price_class

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
  }

  depends_on = [module.api_gateway, module.cognito, module.route53]
}

# ECS infrastructure for container orchestration
module "security_groups" {
  source = "../../modules/security-groups"

  project_name   = var.project_name
  environment    = var.environment
  vpc_id         = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block

  # Service ports
  main_service_port    = var.main_service_port
  solve_service_port   = var.solve_service_port
  cerbos_pdp_grpc_port = 3592

  # Network Load Balancer security group ID
  nlb_security_group_id = module.network_load_balancer.nlb_security_group_id

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }

  depends_on = [module.vpc, module.network_load_balancer]
}


# DocumentDB cluster for MongoDB-compatible database
module "documentdb" {
  source = "../../modules/documentdb"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  allowed_security_group_ids = [
    module.security_groups.main_service_security_group_id,
    module.security_groups.solve_service_security_group_id
  ]

  # Production configuration
  master_username         = var.master_username
  engine_version          = var.engine_version
  instance_class          = var.instance_class
  instance_count          = var.instance_count
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection

  # KMS encryption
  storage_encrypted = var.storage_encrypted
  kms_key_id        = var.kms_key_id

  # DocumentDB logging toggles
  enable_docdb_audit    = var.enable_docdb_audit
  enable_docdb_profiler = var.enable_docdb_profiler
  profiler_threshold_ms = var.profiler_threshold_ms

  # Healthcare compliance configuration
  log_retention_days      = var.log_retention_days_documentdb
  replica_region          = var.replica_region_documentdb
  recovery_window_in_days = var.recovery_window_in_days_documentdb

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }

  depends_on = [module.vpc, module.security_groups]
}



module "ecs" {
  source = "../../modules/ecs"

  project_name   = var.project_name
  environment    = var.environment
  aws_region     = var.aws_region
  aws_account_id = local.effective_aws_account_id

  # IAM role ARNs from the IAM module
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_execution_role_id  = module.iam.ecs_task_execution_role_id

  # VPC and network configuration
  vpc_id                 = module.vpc.vpc_id
  vpc_cidr_block         = module.vpc.vpc_cidr_block
  private_subnet_ids     = module.vpc.private_subnet_ids
  nlb_arn                = module.network_load_balancer.nlb_arn
  nlb_security_group_ids = [module.network_load_balancer.nlb_security_group_id]
  # nlb_target_group_arn   = module.network_load_balancer.target_group_arn

  # Security Group IDs from security groups module
  main_service_security_group_id  = module.security_groups.main_service_security_group_id
  solve_service_security_group_id = module.security_groups.solve_service_security_group_id
  cerbos_pdp_security_group_id    = module.security_groups.cerbos_pdp_security_group_id

  # ECR repository URLs
  main_service_ecr_repository_url  = module.ecr.main_service_repository_url
  solve_service_ecr_repository_url = module.ecr.solve_service_repository_url

  # Service configuration
  # Main service
  main_service_environment_variables   = var.main_service_environment_variables
  main_service_desired_count           = var.main_service_desired_count
  main_service_port                    = var.main_service_port
  main_service_cpu                     = var.main_service_cpu
  main_service_memory                  = var.main_service_memory
  main_service_cpu_architecture        = var.main_service_cpu_architecture
  main_service_operating_system_family = var.main_service_operating_system_family
  main_service_container_name          = var.main_service_container_name

  # Cognito configuration
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.user_pool_client_id

  # Solve service
  solve_service_environment_variables   = var.solve_service_environment_variables
  solve_service_desired_count           = var.solve_service_desired_count
  solve_service_port                    = var.solve_service_port
  solve_service_cpu                     = var.solve_service_cpu
  solve_service_memory                  = var.solve_service_memory
  solve_service_cpu_architecture        = var.solve_service_cpu_architecture
  solve_service_operating_system_family = var.solve_service_operating_system_family

  # Cerbos PDP service
  cerbos_pdp_desired_count           = var.cerbos_pdp_desired_count
  cerbos_pdp_cpu                     = var.cerbos_pdp_cpu
  cerbos_pdp_memory                  = var.cerbos_pdp_memory
  cerbos_pdp_cpu_architecture        = var.cerbos_pdp_cpu_architecture
  cerbos_pdp_operating_system_family = var.cerbos_pdp_operating_system_family
  cerbos_pdp_image                   = var.cerbos_pdp_image

  # Secret ARNs (referencing externally-managed Secrets Manager secrets)
  documentdb_secret_arn                      = module.documentdb.credentials_secret_arn
  documentdb_secret_name                     = module.documentdb.credentials_secret_name
  api_gateway_backend_api_key_parameter_name = module.api_gateway.backend_api_key_parameter.name
  # Impersonation JWT secret ARN passed to the ECS module so the task definition
  # can mount it as an environment secret
  main_service_impersonation_secret_arn = data.aws_secretsmanager_secret.impersonation_jwt.arn

  # SQS Queue URLs (managed by Terraform)
  sqs_solve_queue_url = module.sqs.solve_queue_url
  sqs_email_queue_url = module.email_sqs.email_queue_url

  tags = {
    Environment = var.environment
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }

  depends_on = [
    module.vpc,
    module.ecr,
    module.network_load_balancer,
    module.iam,
    module.documentdb,
    module.security_groups,
    module.sqs,
    module.email_sqs
  ]
}



# Environment-specific SSM parameters for frontend configuration
# resource "aws_ssm_parameter" "frontend_config" {
#   name = "/${var.project_name}/prod/frontend/config"
#   type = "String"
#   value = jsonencode({
#     aws_region                  = var.aws_region
#     cognito_user_pool_id        = module.cognito.user_pool_id
#     cognito_user_pool_client_id = module.cognito.user_pool_client_id
#     # cognito_identity_pool_id    = module.cognito.identity_pool_id
#     api_gateway_domain = var.api_gateway_domain
#     environment        = "prod"
#     cloudfront_domain  = module.frontend.cloudfront_domain_name
#     s3_bucket          = module.frontend.s3_bucket_id
#     website_url        = module.frontend.website_url
#     # Route 53 configuration
#     domain_name         = module.route53.domain_name
#     hosted_zone_id      = module.route53.hosted_zone_id
#     ssl_certificate_arn = module.route53.certificate_arn
#   })

#   description = "Frontend configuration for ${var.project_name} production environment"

#   tags = {
#     Environment = "prod"
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }

#   depends_on = [module.frontend, module.api_gateway, module.cognito, module.route53]
# }

# SSM Parameter for CloudFront distribution ID (useful for deployment scripts)
# resource "aws_ssm_parameter" "frontend_cloudfront_distribution_id" {
#   name  = "/${var.project_name}/prod/frontend/cloudfront-distribution-id"
#   type  = "String"
#   value = module.frontend.cloudfront_distribution_id

#   description = "CloudFront distribution ID for ${var.project_name} production environment"

#   tags = {
#     Environment = "prod"
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#   }

#   depends_on = [module.frontend]
# }

# SSM Parameter for S3 bucket name (useful for deployment scripts)
# resource "aws_ssm_parameter" "frontend_s3_bucket_name" {
#   name  = "/${var.project_name}/prod/frontend/s3-bucket-name"
#   type  = "String"
#   value = module.frontend.s3_bucket_id

#   description = "S3 bucket name for ${var.project_name} production environment"

#   tags = {
#     Environment = "prod"
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#   }

#   depends_on = [module.frontend]
# }

# SSM Parameters for Route 53 configuration (always created for production)
# resource "aws_ssm_parameter" "route53_hosted_zone_id" {
#   name  = "/${var.project_name}/prod/route53/hosted-zone-id"
#   type  = "String"
#   value = module.route53.hosted_zone_id

#   description = "Route 53 hosted zone ID for ${var.project_name} production environment"

#   tags = {
#     Environment = "prod"
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }

#   depends_on = [module.route53]
# }

# resource "aws_ssm_parameter" "route53_name_servers" {
#   name  = "/${var.project_name}/prod/route53/name-servers"
#   type  = "StringList"
#   value = join(",", module.route53.name_servers)

#   description = "Route 53 name servers for ${var.project_name} production environment"

#   tags = {
#     Environment = "prod"
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }

#   depends_on = [module.route53]
# }

# SSL certificate parameter for healthcare compliance monitoring
# resource "aws_ssm_parameter" "ssl_certificate_arn" {
#   name  = "/${var.project_name}/prod/ssl/certificate-arn"
#   type  = "String"
#   value = module.route53.certificate_arn

#   description = "SSL certificate ARN for ${var.project_name} production environment"

#   tags = {
#     Environment = "prod"
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Compliance  = "Healthcare"
#   }

#   depends_on = [module.route53]
# }
