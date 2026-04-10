# S3 Bucket for email templates
resource "aws_s3_bucket" "email_templates" {
  bucket = "${var.project_name}-${var.environment}-email-templates"

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-email-templates"
      Purpose     = "Email Templates Storage"
      Environment = var.environment
      Project     = var.project_name
    }
  )
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "email_templates" {
  bucket = aws_s3_bucket.email_templates.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy to clean up incomplete uploads
resource "aws_s3_bucket_lifecycle_configuration" "email_templates" {
  bucket = aws_s3_bucket.email_templates.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "email_templates" {
  bucket = aws_s3_bucket.email_templates.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bucket policy to allow Lambda read access
resource "aws_s3_bucket_policy" "email_templates" {
  bucket = aws_s3_bucket.email_templates.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaReadAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arn
        }
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.email_templates.arn}/*"
      },
      {
        Sid    = "AllowLambdaListBucket"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arn
        }
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.email_templates.arn
      }
    ]
  })
}
