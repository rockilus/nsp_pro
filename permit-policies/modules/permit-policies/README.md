# Permit.io Policies Module

This Terraform module manages Permit.io authorization policies for the NSP Pro healthcare scheduling application.

## Overview

The module creates:
- **Resources**: Worker, Team, Request, Admin, User
- **Roles**: Leader, Member, Owner, Super Admin (optional)
- **Resource Sets**: Requests created by the user
- **Permissions**: Environment-specific permission sets

## Features

- **Environment-aware**: Different permission sets per environment
- **Security-focused**: Healthcare compliance and least privilege
- **Modular**: Reusable across development, staging, and production
- **Configurable**: Flexible role permissions and super admin control

## Usage

```hcl
module "permit_policies" {
  source = "../../modules/permit-policies"

  environment           = "production"
  permit_project_id     = var.permit_project_id
  permit_environment_id = var.permit_environment_id

  # Optional: Override default permissions
  member_permissions = [
    "read-workers", "read-assignments-validated",
    "create-request", "update-request", "read-requests"
  ]
  
  # Optional: Disable super admin in production
  super_admin_enabled = false

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
```

## Input Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| environment | Environment name (development, staging, production) | `string` | n/a | yes |
| permit_project_id | Permit.io Project ID | `string` | n/a | yes |
| permit_environment_id | Permit.io Environment ID | `string` | n/a | yes |
| leader_permissions | List of permissions for the leader role | `list(string)` | Full permissions | no |
| member_permissions | List of permissions for the member role | `list(string)` | Limited permissions | no |
| member_description | Description for the member role | `string` | "Team member with limited permissions" | no |
| owner_permissions | List of permissions for the owner role | `list(string)` | User management permissions | no |
| super_admin_enabled | Whether to enable super admin role | `bool` | `true` | no |
| super_admin_permissions | List of permissions for the super admin role | `list(string)` | All permissions | no |
| tags | Tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| environment | The environment name |
| worker_resource_id | The ID of the worker resource |
| team_resource_id | The ID of the team resource |
| request_resource_id | The ID of the request resource |
| admin_resource_id | The ID of the admin resource |
| user_resource_id | The ID of the user resource |
| leader_role_id | The ID of the leader role |
| member_role_id | The ID of the member role |
| owner_role_id | The ID of the owner role |
| super_admin_role_id | The ID of the super admin role (if enabled) |
| requests_created_by_user_resource_set_id | The ID of the requests created by user resource set |

## Security Considerations

- **Production**: Super admin should be disabled or have restricted permissions
- **Development**: Extended permissions for testing and development
- **Staging**: Mirror production settings for accurate testing
- **Healthcare Compliance**: All changes are audited and version controlled

## Environment-Specific Configurations

### Development
- Extended member permissions for testing
- Super admin enabled for development support
- More permissive role assignments

### Staging
- Production-like permissions
- Super admin enabled for testing
- Validation environment

### Production
- Restricted permissions
- Super admin disabled or limited
- Healthcare compliance focused
- Audit trails and security monitoring
