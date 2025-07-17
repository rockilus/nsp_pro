# NSP Pro Frontend Deployment with Route 53 Integration

This guide explains how to deploy the NSP Pro Next.js frontend to AWS S3 with optional custom domain support through Route 53.

## Quick Start

### Option 1: Deploy without Custom Domain (CloudFront Only)

```bash
# Deploy to local environment
cd infra/environments/local
terraform apply

# Deploy frontend
../scripts/deploy-frontend.sh --environment local

# Your frontend will be available at the CloudFront URL
```

### Option 2: Deploy with Custom Domain (Route 53 + SSL)

```bash
# Set your domain in production variables
cd infra/environments/prod

# Configure your domain
terraform apply -var="frontend_domain_name=rockilus.com"

# Deploy frontend
../scripts/deploy-frontend.sh --environment prod

# Complete DNS setup (see DNS Setup section below)
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Route53       │────│   CloudFront    │────│   S3 Static     │
│   DNS + SSL     │    │   CDN           │    │   Website       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ACM           │    │   WAF           │    │   CloudWatch    │
│   Certificate   │    │   Security      │    │   Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Deployment Configurations

### Environment Options

| Environment | Domain Type | Features |
|-------------|-------------|----------|
| `local` | CloudFront only | Basic S3 hosting, CloudFront CDN |
| `prod` | Custom domain (optional) | Route 53 DNS, SSL certificates, DNSSEC, health checks |

### Variable Configuration

#### Production with Custom Domain

```hcl
# infra/environments/prod/terraform.tfvars
frontend_domain_name = "rockilus.com"  # Your domain name
```

#### Production without Custom Domain

```hcl
# infra/environments/prod/terraform.tfvars
# Leave frontend_domain_name empty or null for CloudFront-only deployment
```

## Step-by-Step Deployment

### 1. Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.0 installed
- Node.js and npm for frontend build
- Domain registered (for custom domain setup)

### 2. Infrastructure Deployment

#### Option A: CloudFront Only (No Custom Domain)

```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

#### Option B: Custom Domain with Route 53

```bash
cd infra/environments/prod
terraform init
terraform plan -var="frontend_domain_name=your-domain.com"
terraform apply -var="frontend_domain_name=your-domain.com"
```

### 3. DNS Setup (Custom Domain Only)

After applying Terraform with a custom domain:

```bash
# Get the name servers
terraform output route53_name_servers

# Example output:
# [
#   "ns-123.awsdns-12.com",
#   "ns-456.awsdns-45.net", 
#   "ns-789.awsdns-78.org",
#   "ns-012.awsdns-01.co.uk"
# ]
```

**Important**: Update your domain registrar's name servers with these values.

### 4. Frontend Application Deployment

```bash
# Deploy frontend application
./infra/scripts/deploy-frontend.sh --environment prod

# With options
./infra/scripts/deploy-frontend.sh --environment prod --verbose --aws-profile your-profile
```

### 5. Verification

#### Check Infrastructure Status

```bash
cd infra/environments/prod

# Check all outputs
terraform output

# Check specific outputs
terraform output frontend_url
terraform output route53_name_servers  # (if custom domain)
terraform output ssl_certificate_status  # (if custom domain)
```

#### Verify SSL Certificate (Custom Domain)

```bash
# Check certificate validation status
aws acm describe-certificate --certificate-arn $(terraform output -raw ssl_certificate_arn)

# Test SSL
curl -I https://your-domain.com
```

#### Test Website

```bash
# CloudFront URL (always available)
curl -I $(terraform output -raw frontend_url)

# Custom domain (if configured)
curl -I https://your-domain.com
```

## Deployment Script Options

### Basic Usage

```bash
./infra/scripts/deploy-frontend.sh [OPTIONS]
```

### Available Options

| Option | Description | Default |
|--------|-------------|---------|
| `--environment, -e` | Target environment (local/prod) | `local` |
| `--aws-region, -r` | AWS region | `eu-west-3` |
| `--aws-profile, -p` | AWS CLI profile | Default |
| `--dry-run, -d` | Show what would be done | `false` |
| `--skip-build, -s` | Skip frontend build | `false` |
| `--verbose, -v` | Verbose output | `false` |
| `--help, -h` | Show help | - |

### Examples

```bash
# Basic production deployment
./infra/scripts/deploy-frontend.sh --environment prod

# Dry run to see what would happen
./infra/scripts/deploy-frontend.sh --environment prod --dry-run

# Skip build if already done
./infra/scripts/deploy-frontend.sh --environment prod --skip-build

# Verbose output for debugging
./infra/scripts/deploy-frontend.sh --environment prod --verbose

# Use specific AWS profile
./infra/scripts/deploy-frontend.sh --environment prod --aws-profile production
```

## Monitoring and Validation

### Health Checks

The Route 53 module includes health checks for production environments:

```bash
# Check health check status
aws route53 get-health-check --health-check-id $(terraform output -raw health_check_id)

# View health check metrics in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/Route53HealthChecks \
  --metric-name HealthCheckStatus \
  --dimensions Name=HealthCheckId,Value=$(terraform output -raw health_check_id) \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### SSL Certificate Monitoring

```bash
# Check certificate expiration
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw ssl_certificate_arn) \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,DomainName:DomainName}'

# Get certificate transparency logs
aws logs filter-log-events \
  --log-group-name aws-acm-certificate-transparency \
  --filter-pattern "$(terraform output -raw ssl_certificate_arn)"
```

### DNS Monitoring

```bash
# Check DNS query logs
aws logs filter-log-events \
  --log-group-name $(terraform output -raw query_log_group_name) \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern '{ $.responseCode = "NOERROR" }'
```

## Troubleshooting

### Common Issues

#### 1. Certificate Validation Stuck

**Problem**: SSL certificate validation takes too long or fails.

**Solution**:
```bash
# Check DNS propagation
dig TXT _acme-challenge.your-domain.com

# Verify Route 53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id $(terraform output -raw route53_hosted_zone_id) \
  --query 'ResourceRecordSets[?Type==`TXT`]'

# Force certificate re-validation
terraform taint module.route53.aws_acm_certificate_validation.main
terraform apply
```

#### 2. Domain Not Resolving

**Problem**: Custom domain doesn't resolve to the website.

**Solution**:
```bash
# Check name servers at registrar match Route 53
dig NS your-domain.com

# Should match:
terraform output route53_name_servers

# Check A record exists
dig A app.your-domain.com

# Should point to CloudFront
```

#### 3. Health Check Failures

**Problem**: Route 53 health checks are failing.

**Solution**:
```bash
# Test endpoint directly
curl -I https://your-domain.com/

# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id $(terraform output -raw frontend_cloudfront_distribution_id) \
  --query 'Distribution.Status'

# Verify health check configuration
aws route53 get-health-check \
  --health-check-id $(terraform output -raw health_check_id)
```

#### 4. Deployment Failures

**Problem**: Frontend deployment script fails.

**Solution**:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify Terraform state
cd infra/environments/prod
terraform plan

# Check S3 bucket permissions
aws s3 ls $(terraform output -raw frontend_s3_bucket)

# Test deployment with dry run
./infra/scripts/deploy-frontend.sh --environment prod --dry-run --verbose
```

### DNS Propagation

DNS changes can take time to propagate:

```bash
# Check global DNS propagation
for ns in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "Checking $ns:"
  dig @$ns your-domain.com A +short
done

# Use online tools
# - https://dnschecker.org/
# - https://www.whatsmydns.net/
```

### Performance Testing

```bash
# Test CloudFront performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/

# Create curl format file
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

## Security Considerations

### HTTPS Enforcement

- All traffic is automatically redirected to HTTPS
- CloudFront enforces TLS 1.2+ minimum
- HSTS headers are configured for security

### DNSSEC

For production environments with custom domains:

```bash
# Verify DNSSEC is enabled
dig +dnssec your-domain.com

# Check DNSSEC validation
dig +dnssec +validate your-domain.com
```

### WAF Integration

Consider adding AWS WAF for additional security:

```bash
# Check if WAF is configured
aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1
```

## Cost Optimization

### Route 53 Costs

- Hosted Zone: $0.50/month per domain
- DNS Queries: $0.40 per million queries
- Health Checks: $0.50/month per check

### CloudFront Costs

- First 1TB transfer: $0.085/GB
- SSL certificates: Free with ACM
- Cache invalidations: First 1,000 free/month

### Monitoring Costs

```bash
# Check monthly AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Backup and Disaster Recovery

### Infrastructure Backup

```bash
# Export Terraform state
terraform show -json > infrastructure-backup.json

# Export Route 53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id $(terraform output -raw route53_hosted_zone_id) \
  > route53-records-backup.json
```

### Frontend Content Backup

```bash
# Backup S3 content
aws s3 sync s3://$(terraform output -raw frontend_s3_bucket) ./frontend-backup/

# Backup with versioning
aws s3api list-object-versions \
  --bucket $(terraform output -raw frontend_s3_bucket) \
  > s3-versions-backup.json
```

## Next Steps

1. **Set up monitoring alerts** for health checks and certificate expiration
2. **Configure WAF rules** for additional security
3. **Set up automated deployments** with CI/CD pipelines
4. **Implement blue-green deployments** for zero-downtime updates
5. **Add performance monitoring** with CloudWatch insights

## Support and Resources

- [AWS Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [ACM Certificate Documentation](https://docs.aws.amazon.com/acm/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

For issues or questions, check the troubleshooting section above or consult the AWS documentation.
