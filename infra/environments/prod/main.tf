module "cognito" {
  source = "../../modules/cognito"

  project_name              = var.project_name
  environment               = "prod"
  api_gateway_url           = var.api_gateway_domain
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

# Route 53 DNS management with SSL certificates
module "route53" {
  source = "../../modules/route53"

  project_name = var.project_name
  environment  = "prod"
  domain_name  = var.frontend_domain_name != null ? var.frontend_domain_name : "rockilus.com"

  # Security enhancements for healthcare compliance
  enable_dnssec                           = true
  enable_certificate_transparency_logging = true
  enable_query_logging                    = true

  # Multi-region health checks for high availability
  health_check_regions = ["us-east-1", "us-west-2", "eu-west-1"]

  # SSL certificate with wildcard support
  certificate_subject_alternative_names = [
    "*.rockilus.com",
    "app.rockilus.com",
    "api.rockilus.com"
  ]

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
  }
}

module "frontend" {
  source = "../../modules/s3-static-frontend"

  project_name                = var.project_name
  environment                 = "prod"
  aws_region                  = var.aws_region
  api_gateway_domain          = var.api_gateway_domain
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_user_pool_client_id = module.cognito.user_pool_client_id

  # Use Route 53 module outputs for domain configuration
  domain_name     = var.frontend_domain_name != null ? "app.${module.route53.domain_name}" : null
  certificate_arn = var.frontend_domain_name != null ? module.route53.certificate_arn : null
  route53_zone_id = var.frontend_domain_name != null ? module.route53.hosted_zone_id : null

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
  }

  depends_on = [module.api_gateway, module.cognito, module.route53]
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
    api_gateway_domain          = var.api_gateway_domain
    environment                 = "prod"
    cloudfront_domain           = module.frontend.cloudfront_domain_name
    s3_bucket                   = module.frontend.s3_bucket_id
    website_url                 = module.frontend.website_url
    # Route 53 configuration
    domain_name         = var.frontend_domain_name != null ? module.route53.domain_name : null
    hosted_zone_id      = var.frontend_domain_name != null ? module.route53.hosted_zone_id : null
    ssl_certificate_arn = var.frontend_domain_name != null ? module.route53.certificate_arn : null
  })

  description = "Frontend configuration for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Compliance  = "Healthcare"
  }

  depends_on = [module.frontend, module.api_gateway, module.cognito, module.route53]
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

# SSM Parameters for Route 53 configuration (when custom domain is enabled)
resource "aws_ssm_parameter" "route53_hosted_zone_id" {
  count = var.frontend_domain_name != null ? 1 : 0

  name  = "/${var.project_name}/prod/route53/hosted-zone-id"
  type  = "String"
  value = module.route53.hosted_zone_id

  description = "Route 53 hosted zone ID for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Compliance  = "Healthcare"
  }

  depends_on = [module.route53]
}

resource "aws_ssm_parameter" "route53_name_servers" {
  count = var.frontend_domain_name != null ? 1 : 0

  name  = "/${var.project_name}/prod/route53/name-servers"
  type  = "StringList"
  value = join(",", module.route53.name_servers)

  description = "Route 53 name servers for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Compliance  = "Healthcare"
  }

  depends_on = [module.route53]
}

resource "aws_ssm_parameter" "ssl_certificate_arn" {
  count = var.frontend_domain_name != null ? 1 : 0

  name  = "/${var.project_name}/prod/ssl/certificate-arn"
  type  = "String"
  value = module.route53.certificate_arn

  description = "SSL certificate ARN for ${var.project_name} production environment"

  tags = {
    Environment = "prod"
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Compliance  = "Healthcare"
  }

  depends_on = [module.route53]
}
