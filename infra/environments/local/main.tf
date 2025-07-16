module "api_gateway" {
  source = "../../modules/api_gateway"

  project_name = var.project_name
  # environment                   = "local"
  environment                   = "development"
  aws_region                    = var.aws_region
  aws_account_id                = var.aws_account_id
  cors_allowed_origins          = var.cors_allowed_origins
  cognito_user_pool_id          = var.cognito_user_pool_id
  cognito_user_pool_clients_ids = var.cognito_user_pool_clients_ids
  vpc_link_id                   = var.vpc_link_id
  vpc_link_target_arns          = var.vpc_link_target_arns
  vpc_link_endpoint_url         = var.vpc_link_endpoint_url
  api_gateway_stage_name        = var.api_gateway_stage_name
}

module "frontend" {
  source = "../../modules/s3-static-frontend"

  project_name                = var.project_name
  environment                 = "development"
  aws_region                  = var.aws_region
  api_gateway_domain          = module.api_gateway.api_endpoint
  cognito_user_pool_id        = var.cognito_user_pool_id
  cognito_user_pool_client_id = var.cognito_user_pool_clients_ids[0]

  # Optional custom domain configuration
  domain_name     = var.frontend_domain_name
  certificate_arn = var.frontend_certificate_arn
  route53_zone_id = var.frontend_route53_zone_id

  tags = {
    Environment = "development"
    Owner       = "DevOps Team"
  }

  depends_on = [module.api_gateway]
}
