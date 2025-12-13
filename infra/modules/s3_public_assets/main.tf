terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
}

resource "aws_s3_bucket" "public_assets" {
  bucket = "${var.project_name}-${var.environment}-public-assets"

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-public-assets"
      Purpose     = "Public assets for email and marketing"
      Environment = var.environment
      Project     = var.project_name
    }
  )
}

# Explicitly allow public access for this bucket (intended for public assets)
resource "aws_s3_bucket_public_access_block" "public_assets" {
  bucket = aws_s3_bucket.public_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Lifecycle policy to clean up incomplete uploads
resource "aws_s3_bucket_lifecycle_configuration" "public_assets" {
  bucket = aws_s3_bucket.public_assets.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Public bucket policy allowing GetObject for anyone (read-only public access)
resource "aws_s3_bucket_policy" "public_assets" {
  bucket = aws_s3_bucket.public_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowPublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.public_assets.arn}/*"
      }
    ]
  })
}

// Upload the rockilus logo from the existing cognito-assets folder (repo-relative)
resource "aws_s3_object" "logo" {
  bucket       = aws_s3_bucket.public_assets.id
  key          = var.logo_key
  source       = "${path.module}/assets/rockilus_logo_blue.jpg"
  content_type = "image/jpeg"
  acl          = var.acl
}
