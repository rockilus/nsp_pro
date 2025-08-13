terraform {
  required_version = ">= 1.0"

  required_providers {
    permitio = {
      source  = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = var.permit_api_key
}

module "permit_policies" {
  source = "../../modules/permit-policies"

  environment           = "staging"
  permit_project_id     = var.permit_project_id
  permit_environment_id = var.permit_environment_id

  # Staging mirrors production but with super admin enabled for testing
  super_admin_enabled = true
  member_description  = "Staging team member - production-like permissions"

  tags = {
    Environment = "staging"
    Purpose     = "Pre-production testing"
    ManagedBy   = "Terraform"
    Project     = "NSP Pro"
  }
}
