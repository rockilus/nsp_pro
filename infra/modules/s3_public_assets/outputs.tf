output "bucket_name" {
  value = aws_s3_bucket.public_assets.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.public_assets.arn
}

output "logo_url" {
  description = "Public URL for the uploaded logo"
  value       = "https://${aws_s3_bucket.public_assets.bucket}.s3.amazonaws.com/${aws_s3_bucket_object.logo.key}"
}
