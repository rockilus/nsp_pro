# Security Groups Module

This module creates and manages security groups for NSP Pro ECS services.

## Security Groups Created

- **Main Service Security Group**: Security group for the main backend API service
- **Solve Service Security Group**: Security group for the schedule optimization service  
- **Permit PDP Security Group**: Security group for the Permit.io Policy Decision Point service

## Security Configuration

All security groups follow least-privilege access principles:

- Main service accepts traffic from the Network Load Balancer and HTTPS (443) for AWS services
- Solve service has minimal ingress rules and full egress for database/external service communication
- Permit PDP service accepts traffic only from the main service and has restricted HTTPS egress

## Healthcare Compliance

Security groups are configured with healthcare compliance requirements:
- Minimal ingress rules following least-privilege principle
- All egress traffic properly scoped
- Lifecycle management to prevent disruption during updates

## Usage

```terraform
module "security_groups" {
  source = "../../modules/security-groups"

  project_name   = var.project_name
  environment    = "prod"
  vpc_id         = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block

  # Service ports
  main_service_port = var.main_service_port
  solve_service_port = var.solve_service_port  
  permit_pdp_port = var.permit_pdp_port

  # Network Load Balancer security group IDs
  nlb_security_group_ids = [module.network_load_balancer.nlb_security_group_id]

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}
```

## Outputs

- Security group IDs for each service
- Security group ARNs for reference in other modules
