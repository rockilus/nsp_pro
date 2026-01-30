terraform {
  required_version = ">= 1.0"

  required_providers {
    permitio = {
      source = "permitio/permit-io"
      #   version = "~> 0.0.12"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = var.permit_api_key
}

module "permit_policies" {
  source = "../../modules/permit-policies"

  environment           = "development"
  permit_project_id     = var.permit_project_id
  permit_environment_id = var.permit_environment_id

  # Development-specific permissions (more permissive for testing)
  super_admin_enabled = true
  member_description  = "Development team member with extended permissions"

  # Extended member permissions for development
  member_permissions = [
    "read-workers", "update", "read-assignments-validated",
    "delete-request", "create-request", "update-request",
    "read-requests", "read", "read-shifts",
    # Additional dev permissions
    "create-worker", "update-worker", "delete-worker",
    "read-schedules", "create-schedule", "update-schedule",
    "read-assignments", "create-assignment", "update-assignment",
    "read-shift-options",
    # Swap permissions
    "create-swap", "read-swap", "approve-swap"
  ]

  tags = {
    Environment = "development"
    Purpose     = "Development and testing"
    ManagedBy   = "Terraform"
    Project     = "NSP Pro"
  }
}
