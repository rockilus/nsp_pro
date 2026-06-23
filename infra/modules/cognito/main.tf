# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # User attributes configuration
  username_attributes = ["email"]

  # Schema for required user attributes
  # Note: 'email' is a built-in attribute in Cognito. Declaring it as a schema
  # with `required = true` can trigger the AWS error "Required custom
  # attributes are not supported currently." Remove explicit declaration so
  # Terraform does not attempt to add it as a custom attribute.

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

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "family_name"
    required                 = true

    string_attribute_constraints {
      max_length = "2048"
      min_length = "0"
    }
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "given_name"
    required                 = true

    string_attribute_constraints {
      max_length = "2048"
      min_length = "0"
    }
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

  deletion_protection = var.deletion_protection_cognito_user_pool_aws
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


}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Auth flows — server-side only (cookie-based custom auth UI)
  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH", # ADMIN_NO_SRP_AUTH used by backend sign-in
    "ALLOW_REFRESH_TOKEN_AUTH",       # REFRESH_TOKEN_AUTH for cookie-based token refresh
    "ALLOW_USER_SRP_AUTH",            # future-proof SRP fallback
  ]

  # Token validity
  access_token_validity  = 60 # 1 hour
  id_token_validity      = 60 # 1 hour
  refresh_token_validity = 30 # 30 days for persistent sessions
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

  # Security - no client secret for server-side auth
  # generate_secret = false

  # Server-side auth settings
  enable_token_revocation                       = true
  enable_propagate_additional_user_context_data = false

}
