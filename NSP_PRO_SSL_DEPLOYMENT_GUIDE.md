# NSP Pro SSL Certificate Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying SSL certificates for NSP Pro healthcare application domains using the two-step Terraform approach to handle ACM certificate validation limitations.

## 🎯 **Certificate Coverage**

Your configuration will create **one SSL certificate** covering all NSP Pro domains:

- ✅ **`rockilus.com`** - Landing page (root domain)
- ✅ **`app.rockilus.com`** - Frontend application (React/Next.js)
- ✅ **`api.rockilus.com`** - API Gateway (healthcare data API)
- ✅ **`www.rockilus.com`** - Landing page alternative (common practice)
- ✅ **`*.rockilus.com`** - Wildcard for future subdomains
- ✅ **`admin.rockilus.com`** - Future admin portal

## 🚀 **Deployment Steps**

### Step 1: Deploy SSL Certificate
```bash
cd /Users/felipekharaba/Code/nsp_pro/infra/environments/prod
terraform apply -target=module.route53.aws_acm_certificate.main
```

**Expected Output:**
```
Plan: 1 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

**What This Does:**
- Creates the ACM certificate with all required domains
- Generates domain validation options for DNS validation
- Sets up certificate transparency logging for healthcare compliance

### Step 2: Deploy Validation Records and Complete Infrastructure
```bash
terraform apply
```

**Expected Resources Created:**
- Route53 DNS validation records for each domain
- Certificate validation completion
- Frontend S3 bucket and CloudFront distribution
- API Gateway custom domain configuration
- All SSM parameters for operational management

## 🛡️ **Healthcare Compliance Features**

### **Security Standards**
- **TLS 1.2+ Enforcement**: API Gateway and CloudFront security policies
- **Certificate Transparency**: Enabled for audit compliance and security monitoring
- **DNSSEC Support**: Enhanced DNS security for healthcare data protection
- **Automatic Renewal**: ACM handles certificate renewal automatically

### **Operational Excellence**
- **Comprehensive Tagging**: Healthcare compliance and ownership tagging
- **SSM Parameter Storage**: Configuration management for deployment automation
- **Multi-Region Health Checks**: High availability monitoring
- **CloudWatch Integration**: Logging and metrics for compliance reporting

## 📋 **Verification Steps**

### After Step 1 (Certificate Creation):
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn $(terraform output -raw ssl_certificate_arn) --region eu-west-3
```

### After Step 2 (Complete Deployment):
```bash
# Test DNS resolution
nslookup app.rockilus.com
nslookup api.rockilus.com
nslookup rockilus.com

# Test SSL certificate
curl -I https://api.rockilus.com
curl -I https://app.rockilus.com
```

## 🔧 **Troubleshooting**

### If Step 1 Fails:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify Route53 hosted zone exists
aws route53 list-hosted-zones --query "HostedZones[?Name=='rockilus.com.']"
```

### If Step 2 Fails with `for_each` Error:
This should not happen with the updated configuration, but if it does:
```bash
# Apply certificate validation records specifically
terraform apply -target=module.route53.aws_route53_record.certificate_validation
```

### Certificate Validation Issues:
```bash
# Check validation records
aws route53 list-resource-record-sets --hosted-zone-id $(terraform output -raw route53_hosted_zone_id)

# Verify domain ownership
dig TXT _acme-challenge.rockilus.com
```

## 📊 **Expected Timeline**

- **Step 1 (Certificate Creation)**: 30-60 seconds
- **Step 2 (Validation & Infrastructure)**: 10-15 minutes
  - DNS propagation: 1-2 minutes
  - Certificate validation: 2-5 minutes
  - CloudFront distribution: 5-10 minutes
  - API Gateway custom domain: 1-2 minutes

## 🎉 **Success Criteria**

After successful deployment, you should have:

1. **SSL Certificate**: Valid certificate covering all NSP Pro domains
2. **DNS Records**: Proper A/AAAA records for app and api subdomains
3. **API Gateway**: Custom domain `api.rockilus.com` working
4. **Frontend Ready**: S3 bucket and CloudFront distribution for `app.rockilus.com`
5. **Operational Visibility**: SSM parameters for deployment automation

## 🔐 **Security Notes**

- **Certificate is valid for 1 year** with automatic renewal
- **DNS validation records are automatically maintained**
- **Healthcare compliance features are enabled by default**
- **All communications use TLS 1.2+ encryption**

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Verify AWS permissions for Route53, ACM, and API Gateway
3. Ensure domain name servers are pointed to Route53 (after deployment)
4. Review CloudWatch logs for detailed error information

This deployment provides NSP Pro with enterprise-grade SSL infrastructure that meets healthcare industry security and compliance requirements.
