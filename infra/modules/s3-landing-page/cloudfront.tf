# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "landing_page" {
  name                              = "${var.project_name}-landing-page-${var.environment}-oac"
  description                       = "Origin Access Control for ${var.project_name} landing page S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront function to handle trailing slashes for Next.js static export
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.project_name}-landing-url-rewrite-${var.environment}"
  runtime = "cloudfront-js-2.0"
  comment = "Handle trailing slash redirects for Next.js static export (landing page)"
  publish = true
  code    = file("${path.module}/cloudfront-url-rewrite.js")
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "landing_page" {
  origin {
    domain_name              = aws_s3_bucket.landing_page.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.landing_page.id
    origin_id                = "S3-${aws_s3_bucket.landing_page.id}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Rockilus Landing Page (${var.environment})"
  default_root_object = "index.html"

  aliases = concat([var.domain_name], var.apex_domain_name != "" ? [var.apex_domain_name] : [])

  # Cache behavior for Next.js assets — content-hashed, immutable for 1 year
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.landing_page.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 31536000 # 1 year
    max_ttl     = 31536000 # 1 year
  }

  # Cache behavior for other static assets (images, CSS, JS)
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.landing_page.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 24 hours
    max_ttl     = 31536000 # 1 year
  }

  # Default cache behavior with URL rewrite function for Next.js routing
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.landing_page.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # HTML files should not be cached — always revalidate after redeploy
    min_ttl     = 0
    default_ttl = 0 # Respect Cache-Control: no-cache set during S3 sync
    max_ttl     = 60
  }

  price_class = var.cloudfront_price_class

  # No geo-restriction — the landing page is a public marketing site
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.cloudfront_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Map both S3 403 (OAC key-not-found) and 404 to the static 404 page.
  # response_code = 404 keeps crawler/monitoring semantics correct.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 0
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-landing-page-${var.environment}-distribution"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Landing Page CDN"
  })

  depends_on = [
    aws_cloudfront_origin_access_control.landing_page,
    aws_cloudfront_function.url_rewrite
  ]
}
