# Network Load Balancer Deployment Guide

## Overview

This guide walks you through deploying the Network Load Balancer (NLB) infrastructure for the NSP Pro healthcare scheduling application in the production environment.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Credentials**: Configured AWS CLI with appropriate permissions
2. **Terraform**: Version 1.0+ installed
3. **VPC Infrastructure**: Existing VPC with private subnets
4. **Backend Services**: EC2 instances running your backend API services

## Required Permissions

Your AWS user/role needs the following permissions:
- `ec2:*` (for security groups and VPC resources)
- `elasticloadbalancing:*` (for NLB and target groups)
- `iam:PassRole` (for service-linked roles)

## Configuration Steps

### 1. Configure Variables

Copy the example configuration:
```bash
cd infra/environments/prod
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and configure these required variables:

```hcl
# Network Load Balancer Configuration
vpc_id = "vpc-0123456789abcdef0"  # Your VPC ID
private_subnet_ids = [
  "subnet-0123456789abcdef0",     # Private subnet in AZ-1
  "subnet-0987654321fedcba0"      # Private subnet in AZ-2
]
vpc_cidr_blocks = ["10.0.0.0/16"]  # Your VPC CIDR block
backend_port = 8000                  # Port your backend services listen on
backend_instance_ids = [
  "i-0123456789abcdef0",           # EC2 instance running backend service
  "i-0987654321fedcba0"            # Additional EC2 instance for HA
]
```

### 2. Validate Configuration

Run the validation script:
```bash
./validate-nlb-config.sh
```

This will:
- Check Terraform syntax
- Validate required variables
- Run a dry-run deployment plan

### 3. Deploy the Infrastructure

If validation passes, deploy the infrastructure:

```bash
# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Deploy the infrastructure
terraform apply
```

### 4. Update VPC Link Configuration

After deployment, you'll need to update your VPC Link with the new NLB:

1. Note the NLB ARN from Terraform outputs
2. Update your VPC Link to use the new target ARN
3. Update your API Gateway integration

## Post-Deployment Verification

### 1. Check NLB Status
```bash
# Get NLB ARN from Terraform output
NLB_ARN=$(terraform output -raw nlb_arn)

# Check NLB status
aws elbv2 describe-load-balancers --load-balancer-arns $NLB_ARN
```

### 2. Verify Target Health
```bash
# Get target group ARN
TG_ARN=$(terraform output -raw target_group_arn)

# Check target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

### 3. Test Connectivity
```bash
# Get NLB DNS name
NLB_DNS=$(terraform output -raw nlb_dns_name)

# Test connectivity (replace 8000 with your backend port)
curl -v http://$NLB_DNS:8000/health
```

## Security Groups

The deployment creates two security groups:

### NLB Security Group
- **Purpose**: Protects the Network Load Balancer
- **Inbound**: VPC traffic on backend port
- **Outbound**: Backend communication and AWS services

### Backend Services Security Group
- **Purpose**: Protects backend EC2 instances
- **Inbound**: Traffic from NLB and internal services
- **Outbound**: Database, Redis, and AWS services

## Healthcare Compliance Features

This deployment includes several healthcare compliance features:

- **Deletion Protection**: Enabled for production environments
- **Security Groups**: Follow least-privilege access principles
- **Tagging**: Comprehensive tagging for compliance tracking
- **Client IP Preservation**: Maintains audit trails
- **Health Checks**: Ensures service availability

## Troubleshooting

### Common Issues

1. **Target Health Check Failures**
   - Verify backend services are running on the specified port
   - Check security group rules allow traffic from NLB
   - Ensure health check endpoint is responding

2. **VPC Link Integration Issues**
   - Verify NLB is in the correct VPC and subnets
   - Check API Gateway VPC Link configuration
   - Ensure proper IAM permissions for API Gateway

3. **Connectivity Issues**
   - Verify VPC CIDR blocks are correctly configured
   - Check route tables and NACLs
   - Ensure backend instances are in private subnets

### Logs and Monitoring

- **NLB Access Logs**: Can be enabled for detailed request logging
- **CloudWatch Metrics**: Monitor connection counts, target health
- **VPC Flow Logs**: Debug network connectivity issues

## Cleanup

To remove the infrastructure:

```bash
# Disable deletion protection first (if needed)
terraform apply -var="environment=dev"

# Destroy resources
terraform destroy
```

**Warning**: Be cautious when destroying production infrastructure. Ensure you have proper backups and understand the impact.

## Next Steps

After successful deployment:

1. Update your CI/CD pipelines to use the new target group for deployments
2. Configure monitoring and alerting for the NLB and target health
3. Set up automated scaling for your backend services
4. Consider implementing blue-green deployments using multiple target groups
