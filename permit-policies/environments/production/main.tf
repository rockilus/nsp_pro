terraform {
  required_version = ">= 1.0"

  required_providers {
    permitio = {
      source = "permitio/permit-io"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = var.permit_api_key
}

module "permit_policies" {
  source = "../../modules/permit-policies"

  environment           = "production"
  permit_project_id     = var.permit_project_id
  permit_environment_id = var.permit_environment_id

  # Production security: disable super admin for maximum security
  super_admin_enabled = false
  member_description  = "Production team member with restricted permissions"

  tags = {
    Environment = "production"
    Purpose     = "Live healthcare application"
    ManagedBy   = "Terraform"
    Project     = "NSP Pro"
    Compliance  = "Healthcare"
    Security    = "High"
  }
}
