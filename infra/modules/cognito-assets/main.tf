# S3 bucket for Cognito Hosted UI assets (logo and CSS)
resource "aws_s3_bucket" "cognito_assets" {
  bucket = "${var.project_name}-cognito-assets-${var.environment}"

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-cognito-assets-${var.environment}"
      Purpose     = "Cognito Hosted UI branding assets"
      Environment = var.environment
    }
  )
}

# Block public access settings - we'll use bucket policy for specific public read
resource "aws_s3_bucket_public_access_block" "cognito_assets" {
  bucket = aws_s3_bucket.cognito_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy for public read access to assets
resource "aws_s3_bucket_policy" "cognito_assets_public_read" {
  bucket = aws_s3_bucket.cognito_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.cognito_assets.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.cognito_assets]
}

# Upload Rockilus logo
resource "aws_s3_object" "logo" {
  bucket       = aws_s3_bucket.cognito_assets.id
  key          = "logo_dark.png"
  source       = "${path.module}/assets/logo_dark.png"
  content_type = "image/png"
  etag         = filemd5("${path.module}/assets/logo_dark.png")

  tags = merge(
    var.tags,
    {
      Name = "Cognito Hosted UI Logo"
    }
  )

  depends_on = [aws_s3_bucket_policy.cognito_assets_public_read]
}

# Upload custom CSS
resource "aws_s3_object" "custom_css" {
  bucket       = aws_s3_bucket.cognito_assets.id
  key          = "cognito-custom.css"
  source       = "${path.module}/cognito-custom.css"
  content_type = "text/css"
  etag         = filemd5("${path.module}/cognito-custom.css")

  tags = merge(
    var.tags,
    {
      Name = "Cognito Hosted UI Custom CSS"
    }
  )

  depends_on = [aws_s3_bucket_policy.cognito_assets_public_read]
}
