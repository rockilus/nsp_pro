# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-${var.environment}-oac"
  description                       = "Origin Access Control for ${var.project_name} frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront function to handle trailing slashes for Next.js static export
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.project_name}-url-rewrite-${var.environment}"
  runtime = "cloudfront-js-1.0"
  comment = "Handle trailing slash redirects for Next.js SPA with static export"
  publish = true
  code    = file("${path.module}/cloudfront-url-rewrite.js")
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

  # Cache behavior for Next.js assets (highest priority)
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

    # Content-hashed filenames — safe to cache for 1 year as immutable
    min_ttl     = 0
    default_ttl = 31536000 # 1 year
    max_ttl     = 31536000 # 1 year
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

  # Default cache behavior for SPA routing with URL rewrite function
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Add the URL rewrite function
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

    # HTML files carry Cache-Control: no-cache from S3 metadata, so CloudFront
    # will always revalidate with the origin. TTL here is a ceiling only.
    min_ttl     = 0
    default_ttl = 0  # Always respect Cache-Control headers from S3
    max_ttl     = 60 # At most 60 s if no Cache-Control header present
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

  # Custom error responses for SPA routing.
  # response_page_path points to /404.html — a fully self-contained static page
  # (no _next/ JS chunks, no meta-refresh, no auto-redirect) with manual links
  # to /en/, /fr/, /es/. This is a stable, loop-free fallback: if S3 returns
  # 403 or 404 for any path (e.g. /en/index.html missing after a failed deploy),
  # the user lands on a human-readable page rather than back in the language-
  # redirector which could loop. The language-redirector (index.html) also has a
  # client-side loop guard, but /404.html is the structural safety net.
  # error_caching_min_ttl = 0 ensures this error response is never cached by
  # CloudFront edge nodes, so a re-deploy that fixes the missing file is visible
  # immediately without a manual cache invalidation.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/404.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/404.html"
    error_caching_min_ttl = 0
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-frontend-${var.environment}-distribution"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Frontend CDN"
  })

  # Wait for the OAC to be created
  depends_on = [
    aws_cloudfront_origin_access_control.frontend,
    aws_cloudfront_function.url_rewrite
  ]
}
