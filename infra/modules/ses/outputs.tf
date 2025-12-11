output "domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "domain_identity_verification_token" {
  description = "Verification token for the SES domain identity (for DNS TXT record)"
  value       = aws_ses_domain_identity.main.verification_token
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS CNAME records (if DKIM is enabled)"
  value       = var.enable_dkim ? aws_ses_domain_dkim.main[0].dkim_tokens : []
}

output "email_identity_arn" {
  description = "ARN of the SES email identity (if configured)"
  value       = var.from_email_address != "" ? aws_ses_email_identity.sender[0].arn : ""
}

output "configuration_set_name" {
  description = "Name of the SES configuration set"
  value       = aws_ses_configuration_set.main.name
}

output "configuration_set_arn" {
  description = "ARN of the SES configuration set"
  value       = aws_ses_configuration_set.main.arn
}

output "domain_name" {
  description = "Domain name configured for SES"
  value       = var.domain_name
}

output "from_email_address" {
  description = "Email address configured for SES"
  value       = var.from_email_address
}
