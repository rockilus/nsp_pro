# ECS Module

This module creates Amazon Elastic Container Service (ECS) infrastructure for NSP Pro services with healthcare compliance features.

## Features

- **ECS Fargate Cluster**: Serverless container orchestration
- **Three Services**:
  - `main-service`: API Gateway and backend services from ECR
  - `solve-service`: Scheduling optimization service from ECR  
  - `permit-pdp`: Permit.io Policy Decision Point from public image

- **Security & Compliance**:
  - Dedicated security groups for each service with least-privilege access
  - IAM task execution role with minimal required permissions
  - VPC-only networking (no public IP assignment)
  - Container insights enabled for monitoring

- **Service Discovery**:
  - Private DNS namespace for internal service communication
  - Service discovery for main-service and permit-pdp
  - Internal URLs for service-to-service communication

- **Logging & Monitoring**:
  - CloudWatch log groups for each service
  - Container insights for cluster monitoring
  - Health checks for all services

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           ECS Cluster                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Main Service  │  Solve Service  │      Permit PDP            │
│                 │                 │                             │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────┐ │
│ │ Port: 8000  │ │ │ Port: 8001  │ │ │ Port: 7000              │ │
│ │ ECR Image   │ │ │ ECR Image   │ │ │ permitio/pdp-v2:latest  │ │
│ │ 2 Tasks     │ │ │ 1 Task      │ │ │ 1 Task                  │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────────────────┘ │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Service         │ Service         │ Service Discovery           │
│ Discovery       │ (Internal Only) │ permit-pdp.local           │
│ main-service.   │                 │                             │
│ local           │                 │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Usage

```hcl
module "ecs" {
  source = "../../modules/ecs"

  project_name   = var.project_name
  environment    = "prod"
  aws_region     = var.aws_region
  aws_account_id = var.aws_account_id

  # VPC and network configuration
  vpc_id                    = module.vpc.vpc_id
  vpc_cidr_block           = module.vpc.vpc_cidr_block
  private_subnet_ids       = module.vpc.private_subnet_ids
  nlb_security_group_ids   = [module.network_load_balancer.backend_security_group_id]

  # ECR repository URLs
  main_service_ecr_repository_url  = module.ecr.main_service_repository_url
  solve_service_ecr_repository_url = module.ecr.solve_service_repository_url

  # Service configuration
  main_service_desired_count  = 2
  solve_service_desired_count = 1
  permit_pdp_desired_count    = 1

  # Permit.io configuration
  permit_api_key         = var.permit_api_key
  permit_project_id      = var.permit_project_id
  permit_environment_id  = var.permit_environment_id

  # Environment variables
  main_service_environment_variables = {
    "DATABASE_URL" = "mongodb://docdb-cluster:27017"
    "REDIS_URL"    = "redis://redis-cluster:6379"
  }

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
    Project     = "NSP Pro"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (e.g., prod, dev, staging) | `string` | n/a | yes |
| aws_region | AWS region | `string` | n/a | yes |
| aws_account_id | AWS Account ID | `string` | n/a | yes |
| vpc_id | VPC ID where ECS resources will be created | `string` | n/a | yes |
| vpc_cidr_block | CIDR block of the VPC | `string` | n/a | yes |
| private_subnet_ids | List of private subnet IDs for ECS services | `list(string)` | n/a | yes |
| main_service_ecr_repository_url | ECR repository URL for the main service | `string` | n/a | yes |
| solve_service_ecr_repository_url | ECR repository URL for the solve service | `string` | n/a | yes |
| permit_api_key | Permit.io API key for PDP configuration | `string` | n/a | yes |
| permit_project_id | Permit.io project ID | `string` | n/a | yes |
| permit_environment_id | Permit.io environment ID | `string` | n/a | yes |
| nlb_security_group_ids | List of security group IDs from the Network Load Balancer | `list(string)` | `[]` | no |
| main_service_port | Port number for the main service | `number` | `8000` | no |
| solve_service_port | Port number for the solve service | `number` | `8001` | no |
| permit_pdp_port | Port number for the Permit.io PDP service | `number` | `7000` | no |
| main_service_cpu | CPU units for the main service task | `number` | `512` | no |
| main_service_memory | Memory (MiB) for the main service task | `number` | `1024` | no |
| solve_service_cpu | CPU units for the solve service task | `number` | `1024` | no |
| solve_service_memory | Memory (MiB) for the solve service task | `number` | `2048` | no |
| permit_pdp_cpu | CPU units for the Permit.io PDP task | `number` | `256` | no |
| permit_pdp_memory | Memory (MiB) for the Permit.io PDP task | `number` | `512` | no |
| main_service_desired_count | Desired number of main service tasks | `number` | `2` | no |
| solve_service_desired_count | Desired number of solve service tasks | `number` | `1` | no |
| permit_pdp_desired_count | Desired number of Permit.io PDP tasks | `number` | `1` | no |
| log_retention_days | CloudWatch log retention in days | `number` | `30` | no |

## Outputs

| Name | Description |
|------|-------------|
| ecs_cluster_name | Name of the ECS cluster |
| ecs_cluster_arn | ARN of the ECS cluster |
| main_service_internal_url | Internal URL for the main service |
| permit_pdp_internal_url | Internal URL for the Permit PDP service |
| ecs_task_execution_role_arn | ARN of the ECS task execution role |
| service_discovery_namespace_name | Name of the service discovery namespace |
| ecs_deployment_info | ECS deployment information for CI/CD |

## Service Communication

### Internal URLs
- **Main Service**: `http://main-service.{project}-{environment}.local:8000`
- **Permit PDP**: `http://permit-pdp.{project}-{environment}.local:7000`
- **Solve Service**: Direct communication via private subnets (no service discovery)

### Security Groups
Each service has its own security group with specific rules:

- **Main Service**: Accepts traffic from NLB, communicates with database, Redis, and Permit PDP
- **Solve Service**: Internal communication only, access to database and Redis
- **Permit PDP**: Accepts traffic from Main Service, connects to Permit.io cloud

## Health Checks

All services include health check endpoints:
- **Main Service**: `GET /health`
- **Solve Service**: `GET /health`  
- **Permit PDP**: `GET /v1/health`

## Environment Variables

### Main Service
- `ENVIRONMENT`: Environment name (prod, dev, etc.)
- `AWS_REGION`: AWS region
- `PERMIT_PDP_URL`: URL for Permit PDP service
- Custom variables via `main_service_environment_variables`

### Solve Service
- `ENVIRONMENT`: Environment name
- `AWS_REGION`: AWS region
- Custom variables via `solve_service_environment_variables`

### Permit PDP
- `PDP_API_KEY`: Permit.io API key
- `PDP_PROJECT_ID`: Permit.io project ID
- `PDP_ENVIRONMENT_ID`: Permit.io environment ID
- `PDP_DEBUG`: Debug mode (false for prod)

## Scaling Configuration

### CPU and Memory
- **Main Service**: 512 CPU units, 1024 MiB memory (can scale up for high load)
- **Solve Service**: 1024 CPU units, 2048 MiB memory (optimization workloads need more resources)
- **Permit PDP**: 256 CPU units, 512 MiB memory (lightweight authorization service)

### Task Count
- **Main Service**: 2 tasks (for high availability)
- **Solve Service**: 1 task (can scale based on queue length)
- **Permit PDP**: 1 task (sufficient for authorization load)

## Deployment

### Initial Deployment
1. Ensure ECR repositories exist and contain images
2. Configure Permit.io credentials in terraform.tfvars
3. Deploy with Terraform
4. Verify services are healthy in ECS console

### CI/CD Integration
Use the `ecs_deployment_info` output for CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Deploy to ECS
  run: |
    aws ecs update-service \
      --cluster ${{ env.ECS_CLUSTER_NAME }} \
      --service ${{ env.MAIN_SERVICE_NAME }} \
      --task-definition ${{ env.MAIN_SERVICE_TASK_DEFINITION }}:${{ env.IMAGE_TAG }}
```

## Monitoring

### CloudWatch Logs
- `/aws/ecs/{project}-{environment}-main-service`
- `/aws/ecs/{project}-{environment}-solve-service`
- `/aws/ecs/{project}-{environment}-permit-pdp`
- `/aws/ecs/{project}-{environment}-cluster`

### Container Insights
Enabled on the cluster for metrics and monitoring.

## Healthcare Compliance

This module implements healthcare compliance features:
- All communication within VPC (no public internet access)
- Security groups with least-privilege access
- CloudWatch logging for audit trails
- Container insights for monitoring
- IAM roles with minimal required permissions
- Encryption in transit and at rest (via AWS services)

## Troubleshooting

### Common Issues

1. **Tasks fail to start**
   - Check ECR repository permissions
   - Verify task execution role has correct permissions
   - Check CloudWatch logs for container errors

2. **Service discovery not working**
   - Ensure services are in the same VPC
   - Check security group rules
   - Verify DNS resolution within VPC

3. **Permit PDP connection issues**
   - Verify API key and project/environment IDs
   - Check outbound internet access for Permit.io sync
   - Review security group rules

4. **Health check failures**
   - Ensure health check endpoints are implemented
   - Check container startup time vs. health check timing
   - Review application logs in CloudWatch

### Useful Commands

```bash
# Check service status
aws ecs describe-services --cluster {cluster-name} --services {service-name}

# View task logs
aws logs tail /aws/ecs/{project}-{environment}-main-service --follow

# Update service with new image
aws ecs update-service --cluster {cluster-name} --service {service-name} --force-new-deployment

# Check task definition
aws ecs describe-task-definition --task-definition {task-definition-name}
```
