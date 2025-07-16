# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # User attributes configuration
  username_attributes = ["email"]

  # Schema for required user attributes
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "given_name"
    required            = true
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "family_name"
    required            = true
    mutable             = true
  }

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Auto verification
  auto_verified_attributes = ["email"]

  # User pool policies
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Lambda triggers
  lambda_config {
    post_confirmation = module.post_confirmation_lambda.function_arn
  }

  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }

  depends_on = [module.post_confirmation_lambda]
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Token validity
  access_token_validity  = 1  # 1 hour
  id_token_validity      = 1  # 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "given_name",
    "family_name"
  ]

  write_attributes = [
    "email",
    "given_name",
    "family_name"
  ]

  # Security
  generate_secret = false # For frontend apps, should be false
}

# Post-confirmation Lambda module
module "post_confirmation_lambda" {
  source = "./lambda/post_confirmation"

  project_name             = var.project_name
  environment              = var.environment
  aws_region               = var.aws_region
  api_gateway_url          = var.api_gateway_url
  ssm_parameter_dependency = var.api_gateway_ssm_parameter
}
