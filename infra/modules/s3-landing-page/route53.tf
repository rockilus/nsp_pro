# Route53 A record (IPv4) — ALIAS to CloudFront distribution
resource "aws_route53_record" "landing_page" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.landing_page.domain_name
    zone_id                = aws_cloudfront_distribution.landing_page.hosted_zone_id
    evaluate_target_health = false
  }

  depends_on = [aws_cloudfront_distribution.landing_page]
}

# Route53 AAAA record (IPv6) — ALIAS to CloudFront distribution
resource "aws_route53_record" "landing_page_ipv6" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.landing_page.domain_name
    zone_id                = aws_cloudfront_distribution.landing_page.hosted_zone_id
    evaluate_target_health = false
  }

  depends_on = [aws_cloudfront_distribution.landing_page]
}

# Route53 A record for apex domain — ALIAS to same CloudFront distribution (for apex→www redirect)
resource "aws_route53_record" "apex" {
  count   = var.apex_domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.apex_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.landing_page.domain_name
    zone_id                = aws_cloudfront_distribution.landing_page.hosted_zone_id
    evaluate_target_health = false
  }

  depends_on = [aws_cloudfront_distribution.landing_page]
}

# Route53 AAAA record for apex domain (IPv6) — ALIAS to same CloudFront distribution
resource "aws_route53_record" "apex_ipv6" {
  count   = var.apex_domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.apex_domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.landing_page.domain_name
    zone_id                = aws_cloudfront_distribution.landing_page.hosted_zone_id
    evaluate_target_health = false
  }

  depends_on = [aws_cloudfront_distribution.landing_page]
}
