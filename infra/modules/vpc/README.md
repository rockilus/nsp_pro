# VPC Module

This module creates a production-ready VPC infrastructure for the NSP Pro healthcare scheduling application with the following components:

## Features

- **VPC**: Main virtual private cloud with DNS support
- **Public Subnets**: 3 public subnets across different availability zones for high availability
- **Private Subnets**: 3 private subnets across different availability zones for backend services
- **Internet Gateway**: For public internet access
- **NAT Gateway**: For private subnet internet access (outbound only)
- **Route Tables**: Separate routing for public and private subnets
- **VPC Flow Logs**: For security monitoring and compliance (healthcare requirements)
- **Network ACLs**: Additional security layer for healthcare compliance

## Architecture

```
Internet Gateway
       |
   Public Subnets (3 AZs)
       |
   NAT Gateway
       |
   Private Subnets (3 AZs)
```

## Usage

```hcl
module "vpc" {
  source = "../../modules/vpc"

  project_name = "nsp-pro"
  environment  = "prod"
  
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  tags = {
    Environment = "prod"
    Project     = "NSP Pro"
    Compliance  = "Healthcare"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (prod, staging, dev) | `string` | n/a | yes |
| vpc_cidr | CIDR block for the VPC | `string` | `"10.0.0.0/16"` | no |
| public_subnet_cidrs | List of CIDR blocks for public subnets | `list(string)` | `["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]` | no |
| private_subnet_cidrs | List of CIDR blocks for private subnets | `list(string)` | `["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]` | no |
| tags | A map of tags to assign to the resources | `map(string)` | `{}` | no |
| enable_flow_logs | Enable VPC Flow Logs for security monitoring | `bool` | `true` | no |
| flow_log_retention_days | Number of days to retain VPC Flow Logs | `number` | `365` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | ID of the VPC |
| vpc_cidr_block | CIDR block of the VPC |
| public_subnet_ids | IDs of the public subnets |
| private_subnet_ids | IDs of the private subnets |
| public_subnet_cidrs | CIDR blocks of the public subnets |
| private_subnet_cidrs | CIDR blocks of the private subnets |
| internet_gateway_id | ID of the Internet Gateway |
| nat_gateway_id | ID of the NAT Gateway |
| nat_gateway_public_ip | Public IP of the NAT Gateway |
| public_route_table_id | ID of the public route table |
| private_route_table_id | ID of the private route table |
| availability_zones | List of availability zones used |
| vpc_flow_log_id | ID of the VPC Flow Log |
| vpc_flow_log_group_name | Name of the CloudWatch Log Group for VPC Flow Logs |
| network_acl_id | ID of the Network ACL |

## Security Features

### Healthcare Compliance
- VPC Flow Logs enabled by default for audit trails
- Network ACLs for additional security layer
- Proper CIDR block validation
- Secure routing configuration

### High Availability
- Resources deployed across 3 availability zones
- Redundant subnet configuration
- Automatic failover capabilities

### Production Ready
- Proper tagging strategy
- Resource validation
- Error handling
- Documentation

## Prerequisites

- AWS provider configured
- Sufficient IAM permissions for VPC resources
- At least 3 availability zones in the target region

## Notes

- The NAT Gateway is placed in the first public subnet for cost optimization
- VPC Flow Logs are retained for 365 days in production for compliance
- All resources are properly tagged for management and billing
- CIDR blocks are validated to ensure they don't overlap
