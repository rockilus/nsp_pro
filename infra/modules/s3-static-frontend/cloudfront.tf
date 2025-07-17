# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-${var.environment}-oac"
  description                       = "Origin Access Control for ${var.project_name} frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
  }

  # Enable the distribution
  enabled             = true
  is_ipv6_enabled     = true
  comment             = var.cloudfront_comment
  default_root_object = "index.html"

  # Configure custom domain if provided
  aliases = var.domain_name != null ? [var.domain_name] : []

  # Default cache behavior for static assets
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600  # 1 hour
    max_ttl     = 86400 # 24 hours
  }

  # Cache behavior for static assets (images, CSS, JS)
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
      headers = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }

    min_ttl     = 0
    default_ttl = 86400    # 24 hours
    max_ttl     = 31536000 # 1 year
  }

  # Cache behavior for Next.js assets
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 31536000 # 1 year (immutable assets)
    max_ttl     = 31536000 # 1 year
  }

  # Cache behavior for API routes (should not be cached)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      #   headers = ["*"]
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Price class
  price_class = var.cloudfront_price_class

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["FR"] # ISO 3166-1 alpha-2 country code for France
    }
  }
  # SSL/TLS certificate configuration
  viewer_certificate {
    # Use CloudFront-specific certificate if provided, otherwise fall back to certificate_arn
    acm_certificate_arn      = var.cloudfront_certificate_arn != null ? var.cloudfront_certificate_arn : var.certificate_arn
    ssl_support_method       = var.cloudfront_certificate_arn != null || var.certificate_arn != null ? "sni-only" : null
    minimum_protocol_version = var.cloudfront_certificate_arn != null || var.certificate_arn != null ? "TLSv1.2_2021" : null

    # Use CloudFront default certificate if no custom domain
    cloudfront_default_certificate = var.cloudfront_certificate_arn == null && var.certificate_arn == null ? true : null
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-frontend-${var.environment}-distribution"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Frontend CDN"
  })

  # Wait for the OAC to be created
  depends_on = [aws_cloudfront_origin_access_control.frontend]
}
