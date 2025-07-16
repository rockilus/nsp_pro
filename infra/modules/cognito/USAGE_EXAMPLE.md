# Example: How to use the Cognito module in your environment

# First, add the Cognito module to your main.tf:

module "cognito" {
  source = "../../modules/cognito"
  
  project_name    = var.project_name
  environment     = var.environment
  api_gateway_url = module.api_gateway.invoke_url  # Use the API Gateway URL
  backend_api_key = var.backend_api_key            # Store this in terraform.tfvars or AWS Secrets Manager
}

# Then update your API Gateway module to use the Cognito outputs:

module "api_gateway" {
  source = "../../modules/api_gateway"

  project_name                  = var.project_name
  environment                  = var.environment
  aws_region                   = var.aws_region
  aws_account_id               = var.aws_account_id
  cors_allowed_origins         = var.cors_allowed_origins
  cognito_user_pool_id         = module.cognito.user_pool_id          # Use output from Cognito module
  cognito_user_pool_clients_ids = [module.cognito.user_pool_client_id] # Use output from Cognito module
  vpc_link_id                  = var.vpc_link_id
  vpc_link_target_arns         = var.vpc_link_target_arns
  vpc_link_endpoint_url        = var.vpc_link_endpoint_url
  api_gateway_stage_name       = var.api_gateway_stage_name
  backend_api_key              = var.backend_api_key                  # Pass the API key to API Gateway too
}

# Add to your variables.tf:

variable "backend_api_key" {
  description = "API key for backend service authentication"
  type        = string
  sensitive   = true
}

# Add to your terraform.tfvars:

backend_api_key = "your-secure-api-key-here"  # Or reference from AWS Secrets Manager

# Remove these old variables from terraform.tfvars (they'll be managed by the module):
# cognito_user_pool_id        = "eu-west-3_9tyN1YsF6" 
# cognito_user_pool_clients_ids = ["2rccpq0s894f6a66d1hmimship"]

# Add outputs to your outputs.tf:

output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "cognito_user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = module.cognito.user_pool_endpoint
}
