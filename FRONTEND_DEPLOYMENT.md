# Frontend Deployment Guide

This guide explains how to deploy the NSP Pro Next.js frontend to AWS S3 with CloudFront CDN using the Terraform infrastructure.

## Overview

The frontend deployment consists of:
- **S3 Bucket**: Stores static files with versioning and encryption
- **CloudFront Distribution**: Global CDN with custom caching rules
- **IAM Roles**: For deployment automation
- **SSM Parameters**: Store configuration for build process

## Prerequisites

1. **AWS CLI** installed and configured
2. **Terraform** applied for the target environment
3. **Node.js** and **npm** installed
4. **Frontend built** (or use the build script)

## Quick Start

### 1. Deploy Infrastructure

First, apply the Terraform configuration:

```bash
# For local environment
cd infra/environments/local
terraform apply

# For production environment
cd infra/environments/prod
terraform apply
```

### 2. Deploy Frontend

Use the deployment script:

```bash
# Deploy to local environment
./infra/scripts/deploy-frontend.sh

# Deploy to production
./infra/scripts/deploy-frontend.sh -e prod

# Dry run (see what would happen)
./infra/scripts/deploy-frontend.sh -n -e prod
```

## Deployment Script Usage

The `deploy-frontend.sh` script automates the entire deployment process:

```bash
Usage: ./infra/scripts/deploy-frontend.sh [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment to deploy to (local, prod) [default: local]
    -r, --region REGION     AWS region [default: eu-west-3]
    -p, --profile PROFILE   AWS profile to use
    -n, --dry-run          Show what would be done without executing
    -s, --skip-build       Skip building the frontend (deploy existing build)
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message
```

### Examples

```bash
# Basic deployment to local
./infra/scripts/deploy-frontend.sh

# Deploy to production with specific AWS profile
./infra/scripts/deploy-frontend.sh -e prod -p production-profile

# Deploy only (skip build step)
./infra/scripts/deploy-frontend.sh -s -e prod

# Verbose dry run for production
./infra/scripts/deploy-frontend.sh -n -v -e prod
```

## Manual Deployment

If you prefer to deploy manually:

### 1. Build the Frontend

```bash
cd frontend
npm ci
npm run build:static
```

### 2. Get Infrastructure Information

```bash
cd infra/environments/local  # or prod
export S3_BUCKET=$(terraform output -raw frontend_s3_bucket)
export CLOUDFRONT_ID=$(terraform output -raw frontend_cloudfront_distribution_id)
export WEBSITE_URL=$(terraform output -raw frontend_url)
```

### 3. Deploy to S3

```bash
cd frontend
aws s3 sync out/ s3://$S3_BUCKET --delete
```

### 4. Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
```

## Environment Configuration

### Local Environment

The local environment uses:
- Development settings
- LocalStack for testing (if configured)
- CloudFront default domain

### Production Environment

The production environment includes:
- Production optimizations
- Optional custom domain support
- Enhanced security settings

## Frontend Configuration

### Environment Variables

The frontend gets its configuration from SSM parameters created by Terraform:

```javascript
// These are automatically injected during build
NEXT_PUBLIC_AWS_REGION=eu-west-3
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-3_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxx
NEXT_PUBLIC_API_GATEWAY_URL=https://api.example.com
```

### Next.js Configuration

The `next.config.mjs` is already configured for static export:

```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // ... other configurations
};
```

## Custom Domain Setup

To use a custom domain for the frontend:

### 1. Create SSL Certificate

```bash
# Certificate must be in us-east-1 for CloudFront
aws acm request-certificate \
  --domain-name app.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Configure Terraform Variables

Add to your `terraform.tfvars`:

```hcl
frontend_domain_name      = "app.yourdomain.com"
frontend_certificate_arn  = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
frontend_route53_zone_id  = "Z1234567890ABC"
```

### 3. Apply Terraform

```bash
terraform apply
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-3
      
      - name: Deploy Frontend
        run: ./infra/scripts/deploy-frontend.sh -e prod
```

### GitLab CI Example

```yaml
deploy-frontend:
  stage: deploy
  image: node:18-alpine
  before_script:
    - apk add --no-cache aws-cli
  script:
    - ./infra/scripts/deploy-frontend.sh -e prod
  only:
    - main
  variables:
    AWS_DEFAULT_REGION: eu-west-3
```

## Monitoring and Troubleshooting

### CloudFront Metrics

Monitor these CloudFront metrics in AWS CloudWatch:
- `4xxErrorRate` - Client errors
- `5xxErrorRate` - Server errors
- `CacheHitRate` - Cache efficiency
- `BytesDownloaded` - Traffic volume

### Common Issues

#### 1. 403 Forbidden Errors
- Check S3 bucket policy
- Verify CloudFront Origin Access Control
- Ensure files are uploaded to S3

#### 2. Stale Content
- Create CloudFront invalidation
- Check cache headers
- Verify file timestamps in S3

#### 3. SPA Routing Issues
- Verify custom error responses in CloudFront
- Check that `index.html` exists in S3
- Ensure proper error page configuration

### Useful Commands

```bash
# Check CloudFront distribution status
aws cloudfront get-distribution --id E1234567890123

# List S3 bucket contents
aws s3 ls s3://nsp-pro-frontend-development/

# Create manual invalidation
aws cloudfront create-invalidation --distribution-id E1234567890123 --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation --distribution-id E1234567890123 --id I2J3K4L5M6N7O8P9Q

# Get recent CloudFront logs (if enabled)
aws logs filter-log-events --log-group-name /aws/cloudfront/E1234567890123
```

## Security Considerations

1. **S3 Bucket**: Private with CloudFront-only access
2. **CloudFront**: HTTPS redirect enforced
3. **IAM**: Least privilege deployment permissions
4. **Secrets**: Deployment keys should be stored securely

## Cost Optimization

1. **CloudFront Price Class**: Configured to use `PriceClass_100` (lowest cost)
2. **S3 Lifecycle**: Old versions are cleaned up automatically
3. **Caching**: Aggressive caching for static assets

## Backup and Recovery

1. **S3 Versioning**: Enabled for rollback capability
2. **Infrastructure**: Version controlled with Terraform
3. **Deployment**: Previous builds can be redeployed from S3 versions

## Support

For issues with deployment:
1. Check the deployment script logs
2. Verify AWS credentials and permissions
3. Ensure Terraform state is up to date
4. Check AWS CloudWatch logs for detailed error information
