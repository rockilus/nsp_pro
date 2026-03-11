// Google Search Console domain verification TXT record for rockilus.com
resource "aws_route53_record" "google_search_console_verification" {
  zone_id = module.route53.hosted_zone_id
  name    = module.route53.domain_name
  type    = "TXT"
  ttl     = 300

  records = [
    "google-site-verification=pBY5io25zWNESiW8darnt1p3A6vOph0S-1Ia1HOg54g"
  ]

  # Keep this record managed in IaC so it's auditable and reversible.
}
