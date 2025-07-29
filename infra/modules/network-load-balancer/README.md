# Network Load Balancer Module

This Terraform module creates a Network Load Balancer (NLB) with associated target groups and security groups for the NSP Pro healthcare scheduling application.

## Overview

This module provisions:
- **Network Load Balancer**: Internal NLB for API Gateway VPC Link integration
- **Target Group**: TCP target group for backend services
- **Security Groups**: Separate security groups for NLB and backend services
- **Target Group Attachments**: Automatic registration of existing EC2 instances

## Features

### Healthcare Compliance
- Deletion protection enabled for production environments
- Restricted security group rules following least-privilege principles
- Comprehensive tagging for compliance tracking
- Preserve client IP for audit trails

### High Availability
- Cross-zone load balancing enabled
- Health checks with appropriate thresholds
- Graceful deregistration delay for rolling deployments

### Security
- Internal load balancer (not internet-facing)
- Minimal security group rules
- Separate security groups for different service tiers

## Usage

```hcl
module "network_load_balancer" {
  source = "../../modules/network-load-balancer"

  project_name        = var.project_name
  environment         = "prod"
  vpc_id              = var.vpc_id
  private_subnet_ids  = var.private_subnet_ids
  backend_port        = var.backend_port
  allowed_cidr_blocks = var.vpc_cidr_blocks
  vpc_cidr_blocks     = var.vpc_cidr_blocks
  target_instance_ids = var.backend_instance_ids

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment (dev, staging, prod) | `string` | n/a | yes |
| vpc_id | VPC ID where the NLB will be created | `string` | n/a | yes |
| private_subnet_ids | List of private subnet IDs for the NLB | `list(string)` | n/a | yes |
| backend_port | Port for backend services | `number` | `8000` | no |
| allowed_cidr_blocks | CIDR blocks allowed to access the NLB | `list(string)` | `["10.0.0.0/8"]` | no |
| vpc_cidr_blocks | VPC CIDR blocks for internal communication | `list(string)` | n/a | yes |
| tags | Additional tags to apply to all resources | `map(string)` | `{}` | no |
| target_instance_ids | List of EC2 instance IDs to register as targets | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| nlb_arn | ARN of the Network Load Balancer |
| nlb_dns_name | DNS name of the Network Load Balancer |
| nlb_zone_id | Zone ID of the Network Load Balancer |
| target_group_arn | ARN of the target group |
| nlb_security_group_id | Security group ID for the Network Load Balancer |
| backend_security_group_id | Security group ID for backend services |
| vpc_link_target_arns | Target ARNs for VPC Link (NLB ARN) |
| vpc_link_endpoint_url | Endpoint URL for VPC Link |

## Security Groups

### NLB Security Group
- **Inbound**: API Gateway VPC Link traffic on backend port
- **Outbound**: Backend service communication and HTTPS for AWS services

### Backend Services Security Group
- **Inbound**: Traffic from NLB and internal service communication
- **Outbound**: Database (MongoDB), Redis, HTTPS for AWS services, and internal HTTP

## Health Checks

The target group includes TCP health checks with:
- Healthy threshold: 2
- Unhealthy threshold: 2
- Interval: 30 seconds
- Timeout: 10 seconds

## Integration with API Gateway

This module provides outputs specifically designed for API Gateway VPC Link integration:
- `vpc_link_target_arns`: Contains the NLB ARN for VPC Link configuration
- `vpc_link_endpoint_url`: Formatted endpoint URL for API Gateway integration

## Notes

- The NLB is configured as internal-only for security
- Deletion protection is automatically enabled for production environments
- Client IP preservation is enabled for audit and security compliance
- Cross-zone load balancing is enabled for high availability
