output "bucket_name" {
  description = "Name of the S3 bucket containing Cognito assets"
  value       = aws_s3_bucket.cognito_assets.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket containing Cognito assets"
  value       = aws_s3_bucket.cognito_assets.arn
}

output "logo_url" {
  description = "Public URL of the Rockilus logo"
  value       = "https://${aws_s3_bucket.cognito_assets.bucket_regional_domain_name}/${aws_s3_object.logo.key}"
}

output "css_url" {
  description = "Public URL of the custom CSS file"
  value       = "https://${aws_s3_bucket.cognito_assets.bucket_regional_domain_name}/${aws_s3_object.custom_css.key}"
}
