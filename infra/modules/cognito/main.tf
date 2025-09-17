# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # User attributes configuration
  username_attributes = ["email"]

  # Schema for required user attributes
  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      max_length = "2048"
      min_length = "0"
    }
  }

  #   schema {
  #     attribute_data_type = "String"
  #     name                = "email"
  #     required            = true
  #     mutable             = true
  #   }

  schema {
    attribute_data_type = "String"
    name                = "family_name"
    required            = false
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "given_name"
    required            = false
    mutable             = true
  }

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    password_history_size            = 0
    temporary_password_validity_days = 7
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Auto verification
  auto_verified_attributes = ["email"]

  # User pool policies
  #   user_pool_add_ons {
  #     advanced_security_mode = "ENFORCED"
  #   }

  # Lambda triggers
  lambda_config {
    post_confirmation = module.post_confirmation_lambda.function_arn
  }

  # Account recovery settings
  #   account_recovery_setting {
  #     recovery_mechanism {
  #       name     = "verified_email"
  #       priority = 1
  #       #   name     = "verified_phone_number"
  #       #   priority = 2
  #     }
  #   }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }

  deletion_protection = var.deletion_protection_cognito
  user_pool_tier      = "ESSENTIALS"

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD"]
  }

  username_configuration {
    case_sensitive = false
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [schema]
  }

  depends_on = [module.post_confirmation_lambda]
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Auth flows - Updated for SPA
  explicit_auth_flows = [
    "ALLOW_USER_AUTH",
    "ALLOW_USER_SRP_AUTH",
    # "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Token validity - Adjusted for SPA security best practices
  access_token_validity  = 60 # 1 hour
  id_token_validity      = 60 # 1 hour
  refresh_token_validity = 5  # 30 days (typical for SPA)
  auth_session_validity  = 3

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  refresh_token_rotation {
    feature                    = "ENABLED"
    retry_grace_period_seconds = 10
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Required attributes for sign-up
  # read_attributes = [
  #   "email",
  #   "email_verified",
  #   "given_name",
  #   "family_name"
  # ]

  # write_attributes = [
  #   "email",
  #   "given_name",
  #   "family_name"
  # ]

  # Security - no client secret for single-page apps
  # generate_secret = false

  # OAuth configuration for SPA
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  # allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_scopes         = ["email", "openid", "phone"]
  callback_urls                = ["https://${var.frontend_domain_name}/fr/plan/workers/"]
  logout_urls                  = ["https://${var.landing_page_domain_name}"]
  supported_identity_providers = ["COGNITO"]

  # SPA-specific security settings
  enable_token_revocation                       = true
  enable_propagate_additional_user_context_data = false

}

# Cognito User Pool Domain - Required for hosted UI
resource "aws_cognito_user_pool_domain" "main" {
  # domain       = var.cognito_domain_prefix != null ? var.cognito_domain_prefix : "${var.project_name}-${var.environment}"
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id

  managed_login_version = 2
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
