output "bucket_name" {
  description = "Name of the email templates S3 bucket"
  value       = aws_s3_bucket.email_templates.id
}

output "bucket_arn" {
  description = "ARN of the email templates S3 bucket"
  value       = aws_s3_bucket.email_templates.arn
}

output "bucket_domain_name" {
  description = "Domain name of the email templates S3 bucket"
  value       = aws_s3_bucket.email_templates.bucket_domain_name
}
