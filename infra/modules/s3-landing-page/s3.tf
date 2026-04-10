# S3 bucket for static landing page hosting
resource "aws_s3_bucket" "landing_page" {
  bucket = local.bucket_name

  tags = merge(var.tags, {
    Name        = local.bucket_name
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Static Landing Page Hosting"
  })
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket policy — CloudFront OAC-only access
resource "aws_s3_bucket_policy" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.landing_page.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.landing_page.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_cloudfront_distribution.landing_page]
}

# S3 bucket notification configuration
resource "aws_s3_bucket_notification" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id
}

# S3 bucket lifecycle configuration
resource "aws_s3_bucket_lifecycle_configuration" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  rule {
    id     = "landing_page_lifecycle"
    status = "Enabled"

    filter {
      prefix = ""
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Keep non-current versions for rollback
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
