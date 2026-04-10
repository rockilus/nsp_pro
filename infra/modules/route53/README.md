# Route 53 DNS Management Module

This Terraform module manages AWS Route 53 hosted zones with enhanced security and monitoring features for the NSP Pro healthcare application.

## Features

- **Hosted Zone Management**: Complete DNS zone configuration
- **SSL Certificate Automation**: Automatic certificate creation and DNS validation
- **Security Enhancements**: DNSSEC support and certificate transparency logging
- **Monitoring & Logging**: Query logging and health checks for reliability
- **Healthcare Compliance**: Security features aligned with healthcare industry requirements
- **Production-Ready**: Health monitoring and alerting capabilities

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Route53       │────│   ACM           │    │   CloudWatch    │
│   Hosted Zone   │    │   Certificate   │    │   Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DNSSEC        │    │   DNS           │    │   Health        │
│   Security      │    │   Validation    │    │   Checks        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Usage

### Basic Usage

```hcl
module "route53" {
  source = "../../modules/route53"

  project_name = "nsp-pro"
  environment  = "prod"
  domain_name  = "rockilus.com"

  tags = {
    Owner      = "DevOps Team"
    CostCenter = "Engineering"
  }
}
```

### Advanced Configuration

```hcl
module "route53" {
  source = "../../modules/route53"

  project_name = "nsp-pro"
  environment  = "prod" 
  domain_name  = "rockilus.com"

  # Security enhancements
  enable_dnssec                            = true
  enable_certificate_transparency_logging   = true
  
  # Monitoring and logging
  enable_query_logging                     = true
  health_check_regions                     = ["us-east-1", "us-west-2", "eu-west-1"]
  
  # SSL certificate configuration
  certificate_subject_alternative_names    = ["*.rockilus.com", "app.rockilus.com"]

  tags = {
    Environment = "prod"
    Owner       = "DevOps Team"
    Compliance  = "Healthcare"
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

### Core DNS Resources
- `aws_route53_zone` - Primary hosted zone
- `aws_route53_record` - DNS validation records for SSL
- `aws_route53_query_log` - Query logging configuration
- `aws_route53_hosted_zone_dnssec` - DNSSEC signing

### SSL Certificate Resources
- `aws_acm_certificate` - SSL/TLS certificate
- `aws_acm_certificate_validation` - Certificate validation
- `aws_route53_record` - Certificate validation records

### Monitoring Resources
- `aws_route53_health_check` - Application health monitoring
- `aws_cloudwatch_log_group` - Query log storage
- `aws_cloudwatch_metric_alarm` - Health check alerting

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| domain_name | Primary domain name for the hosted zone | `string` | n/a | yes |
| enable_dnssec | Enable DNSSEC for enhanced security | `bool` | `true` | no |
| enable_query_logging | Enable Route 53 query logging | `bool` | `true` | no |
| health_check_regions | AWS regions for health checks | `list(string)` | `["us-east-1", "us-west-2", "eu-west-1"]` | no |
| certificate_subject_alternative_names | Subject Alternative Names for SSL certificate | `list(string)` | `[]` | no |
| enable_certificate_transparency_logging | Enable certificate transparency logging | `bool` | `true` | no |
| tags | Additional tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| hosted_zone_id | The hosted zone ID |
| hosted_zone_arn | The hosted zone ARN |
| domain_name | The domain name of the hosted zone |
| name_servers | A list of name servers in associated delegation set |
| certificate_arn | The ARN of the SSL certificate |
| certificate_domain_name | The domain name for which the certificate is issued |
| certificate_status | Status of the certificate |
| health_check_id | The health check ID (if created) |
| query_log_group_name | CloudWatch log group name for Route53 query logs |
| zone_configuration | Complete zone configuration information |

## Security Features

### DNSSEC (DNS Security Extensions)
- **Enabled by default** for production environments
- Protects against DNS spoofing and cache poisoning attacks
- Validates the authenticity of DNS responses

### Certificate Transparency Logging
- **Enabled by default** for compliance and security monitoring
- Logs certificate issuance to public Certificate Transparency logs
- Helps detect unauthorized certificate issuance

### Query Logging
- **Comprehensive DNS query logging** to CloudWatch
- **30-day retention** for security analysis and compliance
- Enables monitoring of DNS query patterns and potential security threats

### Health Monitoring
- **Production-only health checks** for critical applications
- **Multi-region monitoring** for high availability
- **CloudWatch integration** for alerting and metrics

## Healthcare Compliance Features

### Security
- **DNSSEC validation** for secure DNS resolution
- **Certificate transparency** for SSL/TLS certificate monitoring
- **Query logging** for security audit trails
- **Multi-region health checks** for reliability

### Monitoring
- **Real-time health monitoring** for application availability
- **CloudWatch integration** for metrics and alerting
- **Comprehensive logging** for compliance reporting
- **Security event tracking** through DNS query logs

### Reliability
- **Automated certificate management** with DNS validation
- **Health check failover** capabilities
- **Multi-region deployment** support
- **Disaster recovery** through proper DNS configuration

## Cost Optimization

### Route 53 Pricing Considerations
- **Hosted Zone**: $0.50 per hosted zone per month
- **DNS Queries**: $0.40 per million queries (first 1 billion)
- **Health Checks**: $0.50 per health check per month
- **DNSSEC**: No additional charge
- **Query Logging**: CloudWatch Logs pricing applies

### Optimization Features
- **Configurable health checks** (production-only by default)
- **Optional query logging** (can be disabled for cost savings)
- **Efficient certificate validation** (DNS-based, no additional cost)
- **Regional health check optimization** (configurable regions)

## Integration Examples

### Frontend Module Integration

```hcl
# Route 53 Module
module "route53" {
  source = "../../modules/route53"
  
  project_name = var.project_name
  environment  = "prod"
  domain_name  = "rockilus.com"
}

# Frontend Module using Route 53 outputs
module "frontend" {
  source = "../../modules/s3-static-frontend"
  
  project_name                = var.project_name
  environment                 = "prod"
  domain_name                 = "app.${module.route53.domain_name}"
  certificate_arn             = module.route53.certificate_arn
  route53_zone_id             = module.route53.hosted_zone_id
  
  depends_on = [module.route53]
}
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Deploy DNS Infrastructure
  run: |
    terraform apply -target=module.route53
    echo "Name servers: $(terraform output -json route53_name_servers)"
```

## Troubleshooting

### Common Issues

#### 1. Certificate Validation Timeout
- **Cause**: DNS validation records not properly created
- **Solution**: Verify Route 53 hosted zone is active and DNS propagation is complete
- **Command**: `dig TXT _validation.yourdomain.com`

#### 2. DNSSEC Validation Errors
- **Cause**: Parent domain DS records not configured
- **Solution**: Add DS records to parent domain registrar
- **Reference**: AWS DNSSEC documentation

#### 3. Health Check Failures
- **Cause**: Application not responding on configured endpoint
- **Solution**: Verify application health and endpoint configuration
- **Monitoring**: Check CloudWatch metrics for health check status

### Useful Commands

```bash
# Check DNS propagation
dig NS yourdomain.com

# Verify DNSSEC
dig +dnssec yourdomain.com

# Test health check endpoint
curl -I https://yourdomain.com/

# Check certificate status
aws acm describe-certificate --certificate-arn <arn>

# View query logs
aws logs filter-log-events --log-group-name /aws/route53/nsp-pro-prod-query-logs
```

## Migration Guide

### From Manual DNS Management

1. **Export existing records** before creating hosted zone
2. **Create Route 53 hosted zone** with this module
3. **Update domain registrar** with new name servers
4. **Verify DNS propagation** before removing old records
5. **Monitor health checks** and update alerting

### DNS Propagation Checklist

- [ ] Hosted zone created successfully
- [ ] Certificate validation completed
- [ ] Name servers updated at registrar
- [ ] DNS propagation verified (24-48 hours)
- [ ] Health checks passing
- [ ] Monitoring alerts configured

## Support

For issues with the Route 53 module:
1. Check AWS Route 53 service status
2. Verify domain registrar configuration
3. Review CloudWatch logs for detailed error information
4. Ensure proper IAM permissions for Route 53 operations
