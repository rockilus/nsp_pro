output "s3_bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.landing_page.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.landing_page.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.landing_page.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.landing_page.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.landing_page.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route53 alias records"
  value       = aws_cloudfront_distribution.landing_page.hosted_zone_id
}

output "website_url" {
  description = "URL of the landing page"
  value       = "https://${var.domain_name}"
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

output "route53_record_fqdn" {
  description = "Fully qualified domain name of the landing page Route53 record"
  value       = aws_route53_record.landing_page.fqdn
}
