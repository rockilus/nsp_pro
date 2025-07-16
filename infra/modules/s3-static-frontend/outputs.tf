output "s3_bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_domain_name
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route53 alias records"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}

output "website_url" {
  description = "URL of the website"
  value       = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "deployment_role_arn" {
  description = "ARN of the deployment IAM role"
  value       = aws_iam_role.deployment.arn
}

output "deployment_user_arn" {
  description = "ARN of the deployment IAM user"
  value       = aws_iam_user.deployment_user.arn
}

output "deployment_access_key_id" {
  description = "Access key ID for deployment user"
  value       = aws_iam_access_key.deployment_user.id
  sensitive   = true
}

output "deployment_secret_access_key" {
  description = "Secret access key for deployment user"
  value       = aws_iam_access_key.deployment_user.secret
  sensitive   = true
}

output "frontend_config_ssm_parameter" {
  description = "SSM parameter containing frontend configuration"
  value       = aws_ssm_parameter.frontend_config.name
}

output "route53_record_name" {
  description = "Route53 record name (if created)"
  value       = var.domain_name != null && var.route53_zone_id != null ? aws_route53_record.frontend[0].name : null
}

output "route53_record_fqdn" {
  description = "Route53 record FQDN (if created)"
  value       = var.domain_name != null && var.route53_zone_id != null ? aws_route53_record.frontend[0].fqdn : null
}
