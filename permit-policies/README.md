# Permit.io Policies as Code (PaC)

This directory contains Terraform configurations for managing Permit.io authorization policies across multiple environments for the NSP Pro healthcare scheduling application.

## 🏗️ Architecture

```
permit-policies/
├── environments/           # Environment-specific configurations
│   ├── development/       # Development environment
│   ├── staging/          # Staging environment
│   └── production/       # Production environment
├── modules/              # Reusable Terraform modules
│   └── permit-policies/  # Main policies module
├── deploy.sh            # Deployment script
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
# Set your Permit.io API key
export PERMIT_API_KEY="your-permit-api-key-here"
```

### 2. Configure Environment

```bash
# Copy example config and update with your values
cd environments/development
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual environment IDs
```

### 3. Deploy

```bash
# Plan deployment
./deploy.sh development plan

# Apply changes
./deploy.sh development apply
```

## 🌍 Environments

### Development
- **Purpose**: Development and testing
- **Super Admin**: Enabled for development support
- **Permissions**: Extended member permissions for testing
- **Security**: More permissive for rapid development

### Staging
- **Purpose**: Pre-production testing
- **Super Admin**: Enabled for testing
- **Permissions**: Production-like permissions
- **Security**: Mirrors production settings

### Production
- **Purpose**: Live healthcare application
- **Super Admin**: Disabled for maximum security
- **Permissions**: Restricted and healthcare-compliant
- **Security**: Maximum security and audit trails

## 📋 Resources and Roles

### Resources
- **Worker**: Healthcare workers/staff
- **Team**: Organizational teams
- **Request**: Time-off and scheduling requests
- **Admin**: Administrative functions
- **User**: System users

### Roles
- **Leader**: Team leadership with full scheduling permissions
- **Member**: Team members with limited permissions
- **Owner**: User account ownership permissions
- **Super Admin**: Support role with all permissions (environment-dependent)

## 🔒 Security Features

### Healthcare Compliance
- Least privilege access principles
- Audit trails for all policy changes
- Environment separation
- Role-based access control (RBAC)

### Production Security
- Super admin role disabled
- Restricted permissions
- Healthcare-specific compliance tags
- Enhanced monitoring and logging

## 🛠️ Usage

### Manual Deployment

```bash
# Deploy to development
./deploy.sh development apply

# Deploy to staging
./deploy.sh staging apply

# Deploy to production (use with caution)
./deploy.sh production apply
```

### Available Actions

```bash
./deploy.sh <environment> <action>

# Actions:
# plan     - Show what changes will be made
# apply    - Apply the changes
# destroy  - Destroy resources (use with extreme caution)
# init     - Initialize Terraform
# validate - Validate configuration
```

### CI/CD Deployment

The GitHub Actions workflow automatically:
- Validates all configurations on PR
- Plans deployments for review
- Deploys to development and staging on main branch
- Requires manual approval for production

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PERMIT_API_KEY` | Permit.io API key | ✅ |
| `permit_project_id` | Project ID (default: configured) | ❌ |
| `permit_environment_id` | Environment-specific ID | ✅ |

### Customizing Permissions

You can override default permissions by modifying the environment's `main.tf`:

```hcl
module "permit_policies" {
  source = "../../modules/permit-policies"
  
  # Custom member permissions
  member_permissions = [
    "read-workers",
    "read-shifts",
    "create-request"
  ]
  
  # Disable super admin
  super_admin_enabled = false
}
```

## 🔄 Workflow

### Development Workflow
1. Make changes to policy configurations
2. Test in development environment
3. Create pull request
4. Review Terraform plans in CI
5. Merge to deploy to staging
6. Manual approval for production

### Emergency Changes
```bash
# For urgent production fixes
cd environments/production
terraform plan -var="permit_api_key=$PERMIT_API_KEY"
terraform apply -var="permit_api_key=$PERMIT_API_KEY"
```

## 📊 Monitoring

### Terraform State
- State is managed locally (consider remote state for production)
- Always backup state before major changes
- Use `terraform plan` before `terraform apply`

### Permit.io Dashboard
- Monitor policy changes in the Permit.io dashboard
- Review audit logs regularly
- Set up alerts for policy violations

## 🆘 Troubleshooting

### Common Issues

1. **Missing API Key**
   ```bash
   export PERMIT_API_KEY="your-key-here"
   ```

2. **Wrong Environment ID**
   - Check `terraform.tfvars` for correct environment ID
   - Verify in Permit.io dashboard

3. **Permission Denied**
   - Ensure API key has sufficient permissions
   - Check Permit.io project access

4. **State Lock Issues**
   ```bash
   # Force unlock (use carefully)
   terraform force-unlock LOCK_ID
   ```

### Getting Help

1. Check Terraform validation: `./deploy.sh <env> validate`
2. Review Permit.io documentation
3. Check GitHub Actions logs for CI/CD issues
4. Contact platform team for production issues

## 🔗 Related Documentation

- [Permit.io Documentation](https://docs.permit.io/)
- [Terraform Permit.io Provider](https://registry.terraform.io/providers/permitio/permit-io/latest/docs)
- [NSP Pro Architecture](../README.md)
- [Healthcare Compliance Guidelines](../docs/compliance.md)

## 📝 Contributing

1. Always test changes in development first
2. Follow the existing code structure
3. Update documentation for new features
4. Include security considerations in PRs
5. Test all environments before production deployment

---

**⚠️ Important**: This system manages authorization for a healthcare application. Always follow security best practices and compliance requirements when making changes.
