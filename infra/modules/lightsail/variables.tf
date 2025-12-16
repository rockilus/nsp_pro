variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "availability_zone" {
  description = "AWS availability zone for the Lightsail instance"
  type        = string
}

variable "blueprint_id" {
  description = "Lightsail blueprint ID (e.g., wordpress_6_4_2, wordpress_6_5_3)"
  type        = string
}

variable "bundle_id" {
  description = "Lightsail bundle ID determining instance size and cost (e.g., nano_3_0, micro_3_0, small_3_0)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS record creation"
  type        = string
}

variable "wordpress_domain_name" {
  description = "Domain name for the WordPress site (e.g., www.rockilus.com)"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
