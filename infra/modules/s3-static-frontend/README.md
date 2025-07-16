# S3 Static Frontend Module

This Terraform module deploys a static frontend (Next.js) to AWS S3 with CloudFront distribution for the NSP Pro application.

## Features

- **S3 Bucket**: Secure static website hosting with versioning and encryption
- **CloudFront Distribution**: Global CDN with custom caching rules for Next.js
- **Security**: Origin Access Control (OAC) for secure S3 access
- **Custom Domain**: Optional custom domain support with SSL/TLS
- **Route53 Integration**: Automatic DNS records for custom domains
- **IAM Roles**: Deployment automation roles and policies
- **SPA Support**: Proper routing configuration for Single Page Applications

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   S3 Bucket     │    │   Route53       │
│   Distribution  │    │   (Static Site) │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SSL/TLS       │    │   IAM Roles     │    │   Environment   │
│   Certificate   │    │   (Deployment)  │    │   Configuration │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Note**: This is a pure infrastructure module. Environment-specific configuration (SSM parameters, environment variables) are managed at the environment level (local/prod).

## Usage

### Basic Usage (CloudFront Default Domain)

```hcl
module "frontend" {
  source = "../../modules/s3-static-frontend"

  project_name                = "nsp-pro"
  environment                 = "development"
  aws_region                  = "us-east-1"
  api_gateway_domain          = "api.example.com"
  cognito_user_pool_id        = "us-east-1_XXXXXXXXX"
  cognito_user_pool_client_id = "xxxxxxxxxxxxxxxxxx"
}
```

### Custom Domain Usage

```hcl
module "frontend" {
  source = "../../modules/s3-static-frontend"

  project_name                = "nsp-pro"
  environment                 = "production"
  aws_region                  = "us-east-1"
  api_gateway_domain          = "api.example.com"
  cognito_user_pool_id        = "us-east-1_XXXXXXXXX"
  cognito_user_pool_client_id = "xxxxxxxxxxxxxxxxxx"
  
  # Custom domain configuration
  domain_name      = "app.nsp-pro.com"
  certificate_arn  = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
  route53_zone_id  = "Z1234567890ABC"
  
  tags = {
    Owner       = "DevOps Team"
    CostCenter  = "Engineering"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | ~> 5.0 |

## Providers

| Name | Version |
|------|---------|
| aws | ~> 5.0 |

## Resources Created

### Core Resources
- `aws_s3_bucket` - Static website hosting bucket
- `aws_s3_bucket_versioning` - Bucket versioning configuration
- `aws_s3_bucket_server_side_encryption_configuration` - Bucket encryption
- `aws_s3_bucket_public_access_block` - Security configuration
- `aws_s3_bucket_policy` - CloudFront access policy
- `aws_cloudfront_distribution` - CDN distribution
- `aws_cloudfront_origin_access_control` - Secure S3 access

### Optional Resources
- `aws_route53_record` - DNS A record (if domain_name provided)
- `aws_route53_record` - DNS AAAA record for IPv6 (if domain_name provided)

### IAM Resources
- `aws_iam_role` - Deployment automation role
- `aws_iam_role_policy` - S3 deployment permissions
- `aws_iam_role_policy` - CloudWatch Logs permissions
- `aws_iam_user` - Deployment user
- `aws_iam_user_policy` - User deployment permissions
- `aws_iam_access_key` - User access credentials

### Configuration Storage
- `aws_ssm_parameter` - Frontend configuration
- `aws_ssm_parameter` - CloudFront distribution ID
- `aws_ssm_parameter` - S3 bucket name

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| aws_region | AWS region | `string` | n/a | yes |
| api_gateway_domain | API Gateway domain for CORS configuration | `string` | n/a | yes |
| cognito_user_pool_id | Cognito User Pool ID | `string` | n/a | yes |
| cognito_user_pool_client_id | Cognito User Pool Client ID | `string` | n/a | yes |
| domain_name | Domain name for the frontend (optional) | `string` | `null` | no |
| certificate_arn | SSL certificate ARN for CloudFront | `string` | `null` | no |
| route53_zone_id | Route53 hosted zone ID | `string` | `null` | no |
| cognito_identity_pool_id | Cognito Identity Pool ID (optional) | `string` | `null` | no |
| price_class | CloudFront price class | `string` | `"PriceClass_100"` | no |
| cloudfront_comment | Comment for CloudFront distribution | `string` | `"NSP Pro Frontend Distribution"` | no |
| tags | Additional tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| s3_bucket_id | ID of the S3 bucket |
| s3_bucket_arn | ARN of the S3 bucket |
| cloudfront_distribution_id | ID of the CloudFront distribution |
| cloudfront_domain_name | Domain name of the CloudFront distribution |
| website_url | URL of the website |
| deployment_role_arn | ARN of the deployment IAM role |
| deployment_access_key_id | Access key ID for deployment user (sensitive) |
| deployment_secret_access_key | Secret access key for deployment user (sensitive) |
| route53_record_name | Route53 record name (if created) |
| route53_record_fqdn | Route53 record FQDN (if created) |

**Note**: Environment-specific configuration (SSM parameters) are created at the environment level and available through environment outputs.

## Next.js Configuration

### 1. Update `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  // Disable server-side features for static export
  experimental: {
    // Remove any server-side experimental features
  },
};

export default nextConfig;
```

### 2. Environment Configuration

Create environment-specific files in your frontend directory:

```javascript
// src/config/aws-config.js
export const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
  identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID,
  apiGatewayUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL,
};
```

### 3. Build Scripts

Add deployment scripts to your `package.json`:

```json
{
  "scripts": {
    "build:static": "next build",
    "deploy:local": "npm run build:static && aws s3 sync out/ s3://$S3_BUCKET_NAME --delete",
    "invalidate:cloudfront": "aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths '/*'"
  }
}
```

## Deployment

### Manual Deployment

1. Build the static assets:
   ```bash
   cd frontend
   npm run build
   ```

2. Sync to S3:
   ```bash
   aws s3 sync out/ s3://nsp-pro-frontend-development --delete
   ```

3. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id E1234567890123 --paths "/*"
   ```

### Automated Deployment

Use the provided IAM user credentials in your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Deploy to S3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: us-east-1
  run: |
    aws s3 sync out/ s3://${{ env.S3_BUCKET_NAME }} --delete
    aws cloudfront create-invalidation --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## Security Considerations

1. **S3 Bucket Security**: Bucket is private with CloudFront-only access
2. **SSL/TLS**: All traffic is encrypted in transit
3. **IAM**: Least privilege access for deployment automation
4. **Access Keys**: Handle deployment credentials securely
5. **CORS**: Configure API Gateway CORS to match your domain

## Monitoring and Logging

- CloudFront access logs can be enabled by adding logging configuration
- S3 access logs can be configured for audit purposes
- CloudWatch metrics are automatically available for CloudFront

## Cost Optimization

- Uses `PriceClass_100` by default (lowest cost)
- Configurable caching rules to minimize origin requests
- S3 Intelligent Tiering can be added for long-term storage optimization

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check S3 bucket policy and CloudFront OAC configuration
2. **404 Not Found**: Verify custom error responses for SPA routing
3. **Cache Issues**: Use CloudFront invalidation to clear cached content
4. **SSL Certificate**: Ensure certificate is in `us-east-1` region for CloudFront

### Useful Commands

```bash
# Check CloudFront distribution status
aws cloudfront get-distribution --id E1234567890123

# List S3 bucket contents
aws s3 ls s3://nsp-pro-frontend-development/

# Create CloudFront invalidation
aws cloudfront create-invalidation --distribution-id E1234567890123 --paths "/*"
```
