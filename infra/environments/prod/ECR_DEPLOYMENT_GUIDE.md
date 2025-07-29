# ECR Deployment Guide for Production

This guide covers deploying the ECR repositories for NSP Pro production environment.

## Overview

The ECR module creates two container registries:
1. **Main Service Repository**: For API Gateway and backend services
2. **Solve Service Repository**: For the scheduling optimization service

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Terraform >= 1.0
3. Access to the NSP Pro production AWS account

## Required IAM Permissions

The deploying user/role needs the following permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:CreateRepository",
                "ecr:DeleteRepository",
                "ecr:DescribeRepositories",
                "ecr:ListTagsForResource",
                "ecr:TagResource",
                "ecr:UntagResource",
                "ecr:PutLifecyclePolicy",
                "ecr:GetLifecyclePolicy",
                "ecr:DeleteLifecyclePolicy",
                "ecr:PutRepositoryPolicy",
                "ecr:GetRepositoryPolicy",
                "ecr:DeleteRepositoryPolicy",
                "ecr:PutImageScanningConfiguration",
                "ecr:DescribeImageScanFindings"
            ],
            "Resource": "*"
        }
    ]
}
```

## Deployment Steps

### 1. Navigate to Production Environment
```bash
cd /Users/felipekharaba/Code/nsp_pro/infra/environments/prod
```

### 2. Initialize Terraform (if not already done)
```bash
terraform init
```

### 3. Plan the Deployment
```bash
terraform plan -var-file="terraform.tfvars"
```

### 4. Apply the Changes
```bash
terraform apply -var-file="terraform.tfvars"
```

### 5. Verify Deployment
```bash
# Check ECR repositories
aws ecr describe-repositories --region us-east-1

# Verify repository policies
aws ecr get-repository-policy --repository-name nsp-pro-prod-main-service --region us-east-1
aws ecr get-repository-policy --repository-name nsp-pro-prod-solve-service --region us-east-1
```

## Post-Deployment Configuration

### 1. Get Repository URLs
After deployment, retrieve the repository URLs:
```bash
terraform output ecr_repository_urls
```

Example output:
```
{
  "main_service" = "123456789012.dkr.ecr.us-east-1.amazonaws.com/nsp-pro-prod-main-service"
  "solve_service" = "123456789012.dkr.ecr.us-east-1.amazonaws.com/nsp-pro-prod-solve-service"
}
```

### 2. Configure CI/CD Pipeline
Update your CI/CD pipeline with the repository URLs:

```yaml
# GitHub Actions example
env:
  MAIN_SERVICE_ECR_REPO: ${{ secrets.MAIN_SERVICE_ECR_REPO }}
  SOLVE_SERVICE_ECR_REPO: ${{ secrets.SOLVE_SERVICE_ECR_REPO }}
  AWS_REGION: us-east-1
```

### 3. Set up Docker Build and Push Scripts

Create build scripts for each service:

**Main Service Build Script** (`scripts/build-main-service.sh`):
```bash
#!/bin/bash
set -e

# Variables
AWS_REGION="us-east-1"
ECR_REPO="$(terraform output -raw ecr_main_service_repository_url)"
IMAGE_TAG="${1:-latest}"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build image
docker build -t main-service:$IMAGE_TAG -f backend/api_gateway/Dockerfile backend/

# Tag for ECR
docker tag main-service:$IMAGE_TAG $ECR_REPO:$IMAGE_TAG

# Push to ECR
docker push $ECR_REPO:$IMAGE_TAG

echo "Successfully pushed main-service:$IMAGE_TAG to $ECR_REPO"
```

**Solve Service Build Script** (`scripts/build-solve-service.sh`):
```bash
#!/bin/bash
set -e

# Variables
AWS_REGION="us-east-1"
ECR_REPO="$(terraform output -raw ecr_solve_service_repository_url)"
IMAGE_TAG="${1:-latest}"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build image
docker build -t solve-service:$IMAGE_TAG -f backend/solve_service/Dockerfile backend/

# Tag for ECR
docker tag solve-service:$IMAGE_TAG $ECR_REPO:$IMAGE_TAG

# Push to ECR
docker push $ECR_REPO:$IMAGE_TAG

echo "Successfully pushed solve-service:$IMAGE_TAG to $ECR_REPO"
```

### 4. Make Scripts Executable
```bash
chmod +x scripts/build-main-service.sh
chmod +x scripts/build-solve-service.sh
```

## Monitoring and Maintenance

### 1. Monitor Repository Usage
```bash
# Check repository size and image count
aws ecr describe-repositories --repository-names nsp-pro-prod-main-service nsp-pro-prod-solve-service --region us-east-1

# List images in repository
aws ecr list-images --repository-name nsp-pro-prod-main-service --region us-east-1
```

### 2. Vulnerability Scanning
```bash
# Check scan results
aws ecr describe-image-scan-findings --repository-name nsp-pro-prod-main-service --image-id imageTag=latest --region us-east-1
```

### 3. Lifecycle Policy Verification
```bash
# Check lifecycle policies
aws ecr get-lifecycle-policy --repository-name nsp-pro-prod-main-service --region us-east-1
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure IAM user/role has ECR permissions
   - Check repository policies allow your account

2. **Repository Already Exists**
   - Import existing repository into Terraform state:
   ```bash
   terraform import module.ecr.aws_ecr_repository.main_service nsp-pro-prod-main-service
   ```

3. **Image Push Fails**
   - Ensure you're logged into ECR
   - Check image size limits (10GB max)
   - Verify network connectivity

4. **Lifecycle Policy Issues**
   - Validate JSON syntax in lifecycle policy
   - Ensure rule priorities are unique

### Cleanup (Emergency Only)

⚠️ **WARNING**: Only run in emergency situations. This will delete all container images.

```bash
# Delete repositories (emergency cleanup)
aws ecr delete-repository --repository-name nsp-pro-prod-main-service --force --region us-east-1
aws ecr delete-repository --repository-name nsp-pro-prod-solve-service --force --region us-east-1

# Remove from Terraform state
terraform state rm module.ecr.aws_ecr_repository.main_service
terraform state rm module.ecr.aws_ecr_repository.solve_service
```

## Security Best Practices

1. **Use Specific Image Tags**: Avoid using `latest` in production
2. **Regular Vulnerability Scans**: Monitor scan results regularly
3. **Access Control**: Use least-privilege IAM policies
4. **Image Signing**: Consider implementing image signing for additional security
5. **Audit Trail**: Monitor ECR API calls via CloudTrail

## Healthcare Compliance Notes

- All repositories are encrypted at rest (AES256)
- Image scanning is enabled for vulnerability detection
- Access is restricted to authorized accounts only
- All actions are logged via AWS CloudTrail
- Proper tagging ensures compliance tracking
- Lifecycle policies prevent data retention issues
