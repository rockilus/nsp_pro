# VPC Infrastructure Deployment Guide

This guide covers the deployment of the new VPC infrastructure for NSP Pro production environment.

## Overview

The new VPC module provides a complete networking foundation with:

- **1 VPC** with customizable CIDR block (default: 10.0.0.0/16)
- **3 Public Subnets** across different availability zones for high availability
- **3 Private Subnets** across different availability zones for backend services
- **1 Internet Gateway** for public internet access
- **1 NAT Gateway** for private subnet internet access (outbound only)
- **Route Tables** for proper traffic routing
- **VPC Flow Logs** for security monitoring and compliance
- **Network ACLs** for additional security layer

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Terraform >= 1.0
3. Sufficient IAM permissions for VPC resources
4. At least 3 availability zones in the target region

## Required IAM Permissions

The deployment requires the following AWS IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "logs:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:ListAttachedRolePolicies",
        "iam:ListRolePolicies",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

## Configuration

### 1. Update terraform.tfvars

Update your `terraform.tfvars` file with the VPC configuration:

```hcl
# VPC Configuration
vpc_cidr = "10.0.0.0/16"

public_subnet_cidrs = [
  "10.0.1.0/24",   # Public subnet in AZ-1
  "10.0.2.0/24",   # Public subnet in AZ-2
  "10.0.3.0/24"    # Public subnet in AZ-3
]

private_subnet_cidrs = [
  "10.0.10.0/24",  # Private subnet in AZ-1
  "10.0.11.0/24",  # Private subnet in AZ-2
  "10.0.12.0/24"   # Private subnet in AZ-3
]
```

### 2. Remove Deprecated Variables

The following variables are no longer needed and should be removed from your `terraform.tfvars`:

- `vpc_id`
- `private_subnet_ids`
- `vpc_cidr_blocks`

These values are now provided automatically by the VPC module.

## Deployment Steps

### 1. Initialize Terraform

```bash
cd infra/environments/prod
terraform init
```

### 2. Plan the Deployment

```bash
terraform plan
```

Review the plan carefully. You should see:
- VPC and subnet creation
- Internet Gateway and NAT Gateway creation
- Route tables and associations
- Security groups and Network ACLs
- VPC Flow Logs and CloudWatch log group
- IAM roles for Flow Logs

### 3. Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted to confirm the deployment.

### 4. Verify the Deployment

After deployment, verify the resources:

```bash
# Check VPC
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=*nsp-pro-prod-vpc*"

# Check subnets
aws ec2 describe-subnets --filters "Name=tag:Name,Values=*nsp-pro-prod*"

# Check NAT Gateway
aws ec2 describe-nat-gateways --filter "Name=tag:Name,Values=*nsp-pro-prod-nat-gateway*"

# Check route tables
aws ec2 describe-route-tables --filters "Name=tag:Name,Values=*nsp-pro-prod*"
```

## Post-Deployment

### 1. Update Backend Services

If you have existing backend services, update them to use the new private subnets:

1. Stop existing backend services
2. Launch new instances in the private subnets created by the VPC module
3. Update the `backend_instance_ids` variable with the new instance IDs
4. Apply the configuration again to update the Network Load Balancer

### 2. Security Group Updates

The VPC module creates baseline security groups. You may need to adjust them based on your specific requirements:

- Review ingress/egress rules
- Add specific port access for your applications
- Ensure compliance with healthcare security requirements

### 3. Monitoring Setup

The VPC Flow Logs are automatically configured for security monitoring:

- Flow logs are stored in CloudWatch Logs
- Retention is set to 365 days for production compliance
- Set up CloudWatch alarms for suspicious network activity

## Cost Considerations

The VPC infrastructure includes several AWS resources with associated costs:

1. **NAT Gateway**: ~$45/month + data processing charges
2. **Elastic IP**: ~$3.6/month when not associated with a running instance
3. **VPC Flow Logs**: CloudWatch Logs ingestion and storage costs
4. **Data Transfer**: Standard AWS data transfer rates apply

## Troubleshooting

### Common Issues

1. **Insufficient Availability Zones**
   - Ensure your region has at least 3 AZs
   - Update subnet configuration if fewer AZs are available

2. **CIDR Block Conflicts**
   - Ensure CIDR blocks don't overlap with existing networks
   - Verify subnet CIDRs fall within the VPC CIDR range

3. **IAM Permission Issues**
   - Verify all required IAM permissions are granted
   - Check CloudTrail logs for permission denials

### Validation Commands

```bash
# Validate Terraform configuration
terraform validate

# Check plan for errors
terraform plan -detailed-exitcode

# Test connectivity from private subnets
# (requires EC2 instances in private subnets)
aws ssm start-session --target <instance-id>
```

## Rollback Procedure

If you need to rollback to the previous VPC configuration:

1. Update `terraform.tfvars` to restore old variables:
   ```hcl
   vpc_id = "vpc-xxxxxxxxx"
   private_subnet_ids = ["subnet-xxxxxxxxx", "subnet-yyyyyyyyy"]
   vpc_cidr_blocks = ["10.0.0.0/16"]
   ```

2. Comment out the VPC module in `main.tf`
3. Restore old variables in `variables.tf`
4. Apply the configuration: `terraform apply`

## Security Compliance

This VPC configuration meets healthcare security requirements:

- ✅ Network segmentation with public/private subnets
- ✅ VPC Flow Logs for audit trails
- ✅ Network ACLs for additional security
- ✅ Controlled internet access via NAT Gateway
- ✅ Proper tagging for resource management
- ✅ CIDR block validation
- ✅ High availability across multiple AZs

## Support

For issues or questions about the VPC deployment:

1. Check this deployment guide
2. Review Terraform error messages
3. Check AWS CloudTrail for API call details
4. Contact the DevOps team with specific error messages and context
