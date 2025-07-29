# AWS Secrets Manager Module

This module manages sensitive configuration data for the NSP Pro healthcare scheduling application using AWS Secrets Manager.

## Overview

The module creates and manages the following secrets:
- **Permit.io API Key**: For authorization service
- **SendGrid API Key**: For email notifications
- **SendGrid Connection URI**: For email service configuration
- **MongoDB Atlas Credentials**: Database connection details

## Features

- **Healthcare Compliance**: Configured for healthcare industry security requirements
- **Multi-Region Replication**: Secrets are replicated to a secondary region for disaster recovery
- **KMS Encryption**: All secrets are encrypted using AWS KMS
- **IAM Integration**: Provides IAM roles and policies for ECS task access
- **Audit Logging**: CloudWatch logging for compliance monitoring
- **Automatic Recovery**: Configurable recovery window for accidental deletions

## Usage

```hcl
module "secrets" {
  source = "../../modules/secrets"

  project_name = var.project_name
  environment  = "prod"
  aws_region   = var.aws_region

  # Secret values (typically from terraform.tfvars or environment variables)
  permit_api_key           = var.permit_api_key
  st_api_key        = var.st_api_key
  st_connection_uri = var.st_connection_uri
  atlas_connection_uri    = var.atlas_connection_uri
  atlas_username          = var.atlas_username
  atlas_password          = var.atlas_password
  atlas_database_name     = var.atlas_database_name

  # Optional configurations
  replica_region          = "us-west-2"
  recovery_window_in_days = 30
  log_retention_days      = 90

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}
```

## Accessing Secrets in ECS

The module provides IAM roles and policies that can be attached to ECS tasks for secure secret access:

```hcl
# In your ECS task definition
task_role_arn = module.secrets.secrets_access_role_arn

# Environment variables referencing secrets
secrets = [
  {
    name      = "PERMIT_API_KEY"
    valueFrom = module.secrets.permit_api_key_secret_arn
  },
  {
    name      = "SENDGRID_API_KEY"
    valueFrom = module.secrets.st_api_key_secret_arn
  }
]
```

## Security Considerations

1. **Never store secret values in Terraform code**
2. **Use terraform.tfvars files or environment variables for secret values**
3. **Ensure terraform.tfvars files are not committed to version control**
4. **Regularly rotate secrets according to healthcare compliance requirements**
5. **Monitor CloudWatch logs for unauthorized access attempts**

## Healthcare Compliance

This module is designed with healthcare industry requirements in mind:
- Encryption at rest and in transit
- Audit logging for compliance reporting
- Multi-region disaster recovery
- Configurable retention policies
- IAM least-privilege access

## Outputs

The module provides various outputs for integration with other components:
- Secret ARNs for ECS task definitions
- Secret names for programmatic access
- IAM role ARNs for task execution
- CloudWatch log group names for monitoring

## Dependencies

- AWS Provider ~> 5.0
- Appropriate KMS keys for encryption
- CloudWatch for audit logging

## Cost Considerations

- Each secret incurs AWS Secrets Manager charges
- Cross-region replication adds additional costs
- KMS key usage charges apply
- CloudWatch log storage costs

## Maintenance

- Regularly review and rotate secrets
- Monitor CloudWatch logs for security events
- Update KMS key policies as needed
- Review IAM permissions periodically
