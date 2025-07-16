module "cognito" {
  source = "../../modules/cognito"

  project_name              = var.project_name
  environment               = "prod"
  api_gateway_url           = "https://api.rockilus.com"
  aws_region                = var.aws_region
  api_gateway_ssm_parameter = module.api_gateway.backend_api_key_parameter
}

module "api_gateway" {
  source = "../../modules/api_gateway"

  project_name                  = var.project_name
  environment                   = "prod"
  aws_region                    = var.aws_region
  aws_account_id                = var.aws_account_id
  cors_allowed_origins          = var.cors_allowed_origins
  cognito_user_pool_id          = module.cognito.user_pool_id
  cognito_user_pool_clients_ids = [module.cognito.user_pool_client_id]
  vpc_link_id                   = var.vpc_link_id
  vpc_link_target_arns          = var.vpc_link_target_arns
  vpc_link_endpoint_url         = var.vpc_link_endpoint_url
  api_gateway_stage_name        = var.api_gateway_stage_name
}

module "frontend" {
  source = "../../modules/s3-static-frontend"

  project_name                = var.project_name
  environment                 = "prod"
  aws_region                  = var.aws_region
  api_gateway_domain          = module.api_gateway.api_endpoint
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_user_pool_client_id = module.cognito.user_pool_client_id

  # Optional custom domain configuration
  domain_name     = var.frontend_domain_name
  certificate_arn = var.frontend_certificate_arn
  route53_zone_id = var.frontend_route53_zone_id

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
  }

  depends_on = [module.api_gateway, module.cognito]
}

# Environment-specific SSM parameters for frontend configuration
resource "aws_ssm_parameter" "frontend_config" {
  name = "/${var.project_name}/prod/frontend/config"
  type = "String"
  value = jsonencode({
    aws_region                  = var.aws_region
    cognito_user_pool_id        = module.cognito.user_pool_id
    cognito_user_pool_client_id = module.cognito.user_pool_client_id
    cognito_identity_pool_id    = module.cognito.identity_pool_id
    api_gateway_domain          = module.api_gateway.api_endpoint
    environment                 = "prod"
    cloudfront_domain           = module.frontend.cloudfront_domain_name
    s3_bucket                   = module.frontend.s3_bucket_id
    website_url                 = module.frontend.website_url
  })

  description = "Frontend configuration for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }

  depends_on = [module.frontend, module.api_gateway, module.cognito]
}

# SSM Parameter for CloudFront distribution ID (useful for deployment scripts)
resource "aws_ssm_parameter" "frontend_cloudfront_distribution_id" {
  name  = "/${var.project_name}/prod/frontend/cloudfront-distribution-id"
  type  = "String"
  value = module.frontend.cloudfront_distribution_id

  description = "CloudFront distribution ID for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }

  depends_on = [module.frontend]
}

# SSM Parameter for S3 bucket name (useful for deployment scripts)
resource "aws_ssm_parameter" "frontend_s3_bucket_name" {
  name  = "/${var.project_name}/prod/frontend/s3-bucket-name"
  type  = "String"
  value = module.frontend.s3_bucket_id

  description = "S3 bucket name for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }

  depends_on = [module.frontend]
}
