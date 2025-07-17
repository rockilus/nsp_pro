output "hosted_zone_id" {
  description = "The hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "hosted_zone_arn" {
  description = "The hosted zone ARN"
  value       = aws_route53_zone.main.arn
}

output "domain_name" {
  description = "The domain name of the hosted zone"
  value       = aws_route53_zone.main.name
}

output "name_servers" {
  description = "A list of name servers in associated (or default) delegation set"
  value       = aws_route53_zone.main.name_servers
}

# output "certificate_arn" {
#   description = "The ARN of the SSL certificate"
#   value       = aws_acm_certificate_validation.main.certificate_arn
# }

# output "certificate_domain_name" {
#   description = "The domain name for which the certificate is issued"
#   value       = aws_acm_certificate.main.domain_name
# }

# output "certificate_status" {
#   description = "Status of the certificate"
#   value       = aws_acm_certificate.main.status
# }

# output "certificate_subject_alternative_names" {
#   description = "List of FQDNs covered by the certificate"
#   value       = aws_acm_certificate.main.subject_alternative_names
# }

# output "dnssec_status" {
#   description = "DNSSEC status information"
#   value       = var.enable_dnssec ? aws_route53_hosted_zone_dnssec.main[0].signing_status : "DNSSEC not enabled"
# }

# output "health_check_id" {
#   description = "The health check ID (if created)"
#   value       = var.environment == "prod" ? aws_route53_health_check.main[0].id : null
# }

# output "health_check_arn" {
#   description = "The health check ARN (if created)"
#   value       = var.environment == "prod" ? aws_route53_health_check.main[0].arn : null
# }

# output "query_log_group_name" {
#   description = "CloudWatch log group name for Route53 query logs"
#   value       = var.enable_query_logging ? aws_cloudwatch_log_group.route53_query_logs[0].name : null
# }

# output "query_log_group_arn" {
#   description = "CloudWatch log group ARN for Route53 query logs"
#   value       = var.enable_query_logging ? aws_cloudwatch_log_group.route53_query_logs[0].arn : null
# }

# output "zone_configuration" {
#   description = "Complete zone configuration information"
#   value = {
#     zone_id               = aws_route53_zone.main.zone_id
#     domain_name           = aws_route53_zone.main.name
#     name_servers          = aws_route53_zone.main.name_servers
#     certificate_arn       = aws_acm_certificate_validation.main.certificate_arn
#     dnssec_enabled        = var.enable_dnssec
#     query_logging_enabled = var.enable_query_logging
#     health_check_enabled  = var.environment == "prod"
#   }
# }
