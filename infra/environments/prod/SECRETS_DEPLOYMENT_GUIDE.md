# AWS Secrets Manager Deployment Guide

This guide covers the deployment and management of secrets for the NSP Pro production environment.

## Overview

The secrets module manages the following sensitive configuration data:
- **Permit.io API Key**: For authorization and access control
- **SendGrid API Key**: For email notifications
- **SendGrid Connection URI**: For email service configuration  
- **MongoDB Atlas Credentials**: Database connection details

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Terraform installed** (version >= 1.0)
3. **Access to secret values** from respective service providers
4. **Production environment setup** completed

## Required AWS Permissions

Ensure your AWS user/role has the following permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:*",
                "kms:CreateKey",
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:DescribeKey",
                "iam:CreateRole",
                "iam:CreatePolicy",
                "iam:AttachRolePolicy",
                "logs:CreateLogGroup",
                "logs:DescribeLogGroups"
            ],
            "Resource": "*"
        }
    ]
}
```

## Deployment Steps

### 1. Configure Secret Values

Copy the example configuration file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and provide your actual secret values:
```hcl
# Permit.io Configuration
permit_api_key        = "permit_live_..."
permit_project_id     = "your-project-id"
permit_environment_id = "your-env-id"

# SendGrid Configuration
st_api_key        = "SG...."
st_connection_uri = "smtp://apikey:SG....@smtp.st.net:587"

# MongoDB Atlas Configuration
atlas_connection_uri = "mongodb+srv://user:pass@cluster.mongodb.net/nsp_pro?retryWrites=true&w=majority"
```

### 2. Initialize Terraform

```bash
cd /path/to/nsp_pro/infra/environments/prod
terraform init
```

### 3. Plan the Deployment

```bash
terraform plan -target=module.secrets
```

Review the plan to ensure all secrets will be created correctly.

### 4. Deploy the Secrets

```bash
terraform apply -target=module.secrets
```

### 5. Verify Deployment

Check that secrets were created:
```bash
aws secretsmanager list-secrets --region us-east-1 --query 'SecretList[?starts_with(Name, `nsp-pro-prod`)]'
```

## Security Best Practices

### 1. Secret Rotation

Set up automatic rotation for database credentials:
```bash
aws secretsmanager rotate-secret \
    --secret-id nsp-pro-prod-mongodb-atlas \
    --rotation-lambda-arn arn:aws:lambda:us-east-1:account:function:SecretsManagerMongoDBRotation
```

### 2. Access Monitoring

Monitor secret access via CloudWatch:
```bash
aws logs filter-log-events \
    --log-group-name /aws/secretsmanager/nsp-pro-prod \
    --start-time $(date -d '1 hour ago' +%s)000
```

### 3. Regular Audits

Periodically review secret access patterns:
```bash
# View recent secret retrievals
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
    --start-time $(date -d '24 hours ago' --iso-8601)
```

## Environment Variables for CI/CD

For automated deployments, use environment variables instead of terraform.tfvars:

```bash
export TF_VAR_permit_api_key="permit_live_..."
export TF_VAR_st_api_key="SG...."
export TF_VAR_atlas_connection_uri="mongodb+srv://..."
```

## Troubleshooting

### Secret Creation Failed

If secret creation fails due to naming conflicts:
```bash
# List existing secrets
aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `nsp-pro`)]'

# Delete conflicting secret (if safe to do so)
aws secretsmanager delete-secret --secret-id nsp-pro-prod-permit-api-key --force-delete-without-recovery
```

### KMS Key Issues

If KMS encryption fails:
```bash
# Check KMS key policy
aws kms describe-key --key-id alias/aws/secretsmanager

# Create custom KMS key if needed
aws kms create-key --description "NSP Pro Secrets Encryption Key"
```

### IAM Permission Issues

If IAM operations fail:
```bash
# Check current permissions
aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::account:user/username \
    --action-names secretsmanager:CreateSecret \
    --resource-arns "*"
```

## Accessing Secrets in Applications

### ECS Tasks

Secrets are automatically available to ECS tasks via the secrets access role:
```json
{
  "secrets": [
    {
      "name": "PERMIT_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:nsp-pro-prod-permit-api-key"
    }
  ]
}
```

### Local Development

For local development, retrieve secrets manually:
```bash
aws secretsmanager get-secret-value \
    --secret-id nsp-pro-prod-permit-api-key \
    --query SecretString --output text
```

## Compliance and Audit

### Healthcare Compliance Features

- **Encryption at rest**: All secrets encrypted with KMS
- **Encryption in transit**: TLS for all API calls
- **Access logging**: All access logged to CloudWatch
- **Multi-region backup**: Secrets replicated to us-west-2
- **Recovery protection**: 30-day recovery window

### Audit Reports

Generate compliance reports:
```bash
# Secret access audit
aws logs filter-log-events \
    --log-group-name /aws/secretsmanager/nsp-pro-prod \
    --filter-pattern "{ $.eventName = GetSecretValue }" \
    --start-time $(date -d '30 days ago' +%s)000

# KMS key usage audit
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=ResourceName,AttributeValue=arn:aws:kms:us-east-1:account:key/key-id \
    --start-time $(date -d '30 days ago' --iso-8601)
```

## Cleanup

To remove all secrets (⚠️ **CAUTION: IRREVERSIBLE**):
```bash
terraform destroy -target=module.secrets
```

## Support

For issues with secrets management:
1. Check CloudWatch logs: `/aws/secretsmanager/nsp-pro-prod`
2. Review Terraform state: `terraform state list | grep secrets`
3. Verify AWS permissions and quotas
4. Contact the DevOps team for assistance
