# ECR Module

This module creates Amazon Elastic Container Registry (ECR) repositories for NSP Pro services with healthcare compliance features.

## Features

- **Two ECR repositories**:
  - `main_service`: For the API Gateway/main service container images
  - `solve_service`: For the scheduling solver service container images

- **Security & Compliance**:
  - AES256 encryption at rest
  - Image scanning on push for vulnerability detection
  - Restricted repository policies with least-privilege access
  - Healthcare compliance tagging

- **Lifecycle Management**:
  - Automatic cleanup of old images to reduce costs
  - Production images retained for 30 versions
  - Development images retained for 10 versions
  - Untagged images automatically deleted after 1 day

## Usage

```hcl
module "ecr" {
  source = "../../modules/ecr"

  project_name   = var.project_name
  environment    = "prod"
  aws_account_id = var.aws_account_id

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
| aws_account_id | AWS Account ID | `string` | n/a | yes |
| tags | A map of tags to assign to the resource | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| main_service_repository_arn | ARN of the main service ECR repository |
| main_service_repository_name | Name of the main service ECR repository |
| main_service_repository_url | URL of the main service ECR repository |
| main_service_registry_id | Registry ID where the main service repository was created |
| solve_service_repository_arn | ARN of the solve service ECR repository |
| solve_service_repository_name | Name of the solve service ECR repository |
| solve_service_repository_url | URL of the solve service ECR repository |
| solve_service_registry_id | Registry ID where the solve service repository was created |
| repository_urls | Map of all ECR repository URLs |
| repository_arns | Map of all ECR repository ARNs |

## Repository Naming Convention

- Main Service: `{project_name}-{environment}-main-service`
- Solve Service: `{project_name}-{environment}-solve-service`

Example for production:
- `nsp-pro-prod-main-service`
- `nsp-pro-prod-solve-service`

## Image Tagging Best Practices

### Production Images
- `v1.0.0`, `v1.1.0` - Semantic versioning
- `release-2024-01-15` - Release tags
- `prod-stable` - Production stable builds

### Development Images
- `dev-feature-branch` - Development builds
- `staging-v1.0.0-rc1` - Release candidates
- `test-pr-123` - Pull request builds

### Docker Commands

#### Login to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {account_id}.dkr.ecr.us-east-1.amazonaws.com
```

#### Build and Push Main Service
```bash
# Build the image
docker build -t nsp-pro-prod-main-service:v1.0.0 .

# Tag for ECR
docker tag nsp-pro-prod-main-service:v1.0.0 {account_id}.dkr.ecr.us-east-1.amazonaws.com/nsp-pro-prod-main-service:v1.0.0

# Push to ECR
docker push {account_id}.dkr.ecr.us-east-1.amazonaws.com/nsp-pro-prod-main-service:v1.0.0
```

#### Build and Push Solve Service
```bash
# Build the image
docker build -t nsp-pro-prod-solve-service:v1.0.0 .

# Tag for ECR
docker tag nsp-pro-prod-solve-service:v1.0.0 {account_id}.dkr.ecr.us-east-1.amazonaws.com/nsp-pro-prod-solve-service:v1.0.0

# Push to ECR
docker push {account_id}.dkr.ecr.us-east-1.amazonaws.com/nsp-pro-prod-solve-service:v1.0.0
```

## Security Considerations

1. **Repository Policies**: Only specific IAM roles can pull/push images
2. **Encryption**: All images are encrypted at rest using AES256
3. **Vulnerability Scanning**: Images are automatically scanned for vulnerabilities
4. **Access Control**: Least-privilege access model enforced
5. **Audit Trail**: All actions are logged via AWS CloudTrail

## Healthcare Compliance

This module is designed with healthcare compliance in mind:
- Encryption at rest and in transit
- Audit logging and monitoring
- Access controls and least-privilege principle
- Automated vulnerability scanning
- Proper resource tagging for compliance tracking

## Cost Optimization

The lifecycle policies automatically manage image retention to minimize storage costs:
- Old development images are cleaned up regularly
- Production images are retained longer for rollback capability
- Untagged images are removed quickly to prevent storage bloat
