terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# Lightsail instance for WordPress landing page
resource "aws_lightsail_instance" "wordpress" {
  #   name              = "${var.project_name}-${var.environment}-wordpress"
  name              = "rockilus-landing-page"
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-wordpress"
      Purpose     = "WordPress Landing Page"
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      Component   = "Lightsail"
    }
  )
}

# Static IP for the WordPress instance
resource "aws_lightsail_static_ip" "wordpress" {
  #   name = "${var.project_name}-${var.environment}-wordpress-ip"
  name = "StaticIp-1"
}

# Attach static IP to the instance
resource "aws_lightsail_static_ip_attachment" "wordpress" {
  static_ip_name = aws_lightsail_static_ip.wordpress.name
  instance_name  = aws_lightsail_instance.wordpress.name
}

# Route53 A record pointing to Lightsail static IP
resource "aws_route53_record" "wordpress" {
  zone_id = var.route53_zone_id
  name    = var.wordpress_domain_name
  type    = "A"
  ttl     = 300
  records = [aws_lightsail_static_ip.wordpress.ip_address]
}

# IMPORT COMMANDS (run these manually to import existing resources):
# terraform import module.lightsail.aws_lightsail_instance.wordpress <your-instance-name>
# terraform import module.lightsail.aws_lightsail_static_ip.wordpress <your-static-ip-name>
# terraform import module.lightsail.aws_lightsail_static_ip_attachment.wordpress <your-static-ip-name>
# Note: Route53 record will be created new or imported if it exists
