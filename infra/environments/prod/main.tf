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
