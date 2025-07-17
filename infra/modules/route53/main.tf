# Route 53 Hosted Zone Module
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local values for common naming and tagging
locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Module      = "route53"
    Purpose     = "DNS Management"
  })

  # Certificate domains including SANs
  certificate_domains = concat([var.domain_name], var.certificate_subject_alternative_names)
}

# Route 53 Hosted Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = merge(local.common_tags, {
    Name          = "${var.project_name}-${var.environment}-hosted-zone"
    Domain        = var.domain_name
    DNSSECEnabled = var.enable_dnssec
  })
}

# DNSSEC Signing (for enhanced security)
resource "aws_route53_hosted_zone_dnssec" "main" {
  count = var.enable_dnssec ? 1 : 0

  hosted_zone_id = aws_route53_zone.main.id

  depends_on = [aws_route53_zone.main]
}

# CloudWatch Log Group for Route 53 Query Logging
resource "aws_cloudwatch_log_group" "route53_query_logs" {
  count = var.enable_query_logging ? 1 : 0

  name              = "/aws/route53/${var.project_name}-${var.environment}-query-logs"
  retention_in_days = 30 # Adjust based on compliance requirements

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-route53-query-logs"
    Purpose = "DNS Security Monitoring"
  })
}

# Route 53 Query Logging Configuration
resource "aws_route53_query_log" "main" {
  count = var.enable_query_logging ? 1 : 0

  depends_on = [aws_cloudwatch_log_group.route53_query_logs]

  cloudwatch_log_group_arn = aws_cloudwatch_log_group.route53_query_logs[0].arn
  zone_id                  = aws_route53_zone.main.zone_id
}

# SSL Certificate (managed by AWS Certificate Manager)
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.certificate_subject_alternative_names
  validation_method         = "DNS"

  # Certificate transparency logging for security compliance
  options {
    certificate_transparency_logging_preference = var.enable_certificate_transparency_logging ? "ENABLED" : "DISABLED"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-ssl-certificate"
    Domain  = var.domain_name
    Purpose = "SSL/TLS Security"
  })
}

# DNS Validation Records for SSL Certificate
resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id

  depends_on = [aws_route53_zone.main]
}

# Certificate Validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]

  timeouts {
    create = "10m"
  }

  depends_on = [aws_route53_record.certificate_validation]
}

# Health Check for Primary Domain (optional)
resource "aws_route53_health_check" "main" {
  count = var.environment == "prod" ? 1 : 0

  fqdn                            = var.domain_name
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_alarm_region         = "us-east-1" # Required for Route53 health checks
  cloudwatch_alarm_name           = "${var.project_name}-${var.environment}-health-check-alarm"
  insufficient_data_health_status = "LastKnownStatus"

  regions = var.health_check_regions

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-health-check"
    Domain  = var.domain_name
    Purpose = "Application Health Monitoring"
  })
}

# CloudWatch Alarm for Health Check
resource "aws_cloudwatch_metric_alarm" "health_check" {
  count = var.environment == "prod" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-health-check-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "This metric monitors the health of ${var.domain_name}"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    HealthCheckId = aws_route53_health_check.main[0].id
  }

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-health-alarm"
    Purpose = "Health Monitoring"
  })
}
