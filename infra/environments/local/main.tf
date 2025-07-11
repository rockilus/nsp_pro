module "api_gateway" {
  source = "../../modules/api_gateway"

  project_name                = var.project_name
  environment                 = "local"
  aws_region                  = var.aws_region
  cors_allowed_origins        = var.cors_allowed_origins
  cognito_user_pool_id        = var.cognito_user_pool_id
  cognito_user_pool_clients_ids = var.cognito_user_pool_clients_ids
  vpc_link_id                 = var.vpc_link_id
  vpc_link_endpoint_url       = var.vpc_link_endpoint_url
}
