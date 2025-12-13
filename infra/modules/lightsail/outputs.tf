output "instance_id" {
  description = "ID of the Lightsail instance"
  value       = aws_lightsail_instance.wordpress.id
}

output "instance_arn" {
  description = "ARN of the Lightsail instance"
  value       = aws_lightsail_instance.wordpress.arn
}

output "instance_name" {
  description = "Name of the Lightsail instance"
  value       = aws_lightsail_instance.wordpress.name
}

output "static_ip_address" {
  description = "Static public IP address of the WordPress instance"
  value       = aws_lightsail_static_ip.wordpress.ip_address
}

output "static_ip_arn" {
  description = "ARN of the static IP"
  value       = aws_lightsail_static_ip.wordpress.arn
}

output "username" {
  description = "Default username for the Lightsail instance"
  value       = aws_lightsail_instance.wordpress.username
}

output "availability_zone" {
  description = "Availability zone where the instance is deployed"
  value       = aws_lightsail_instance.wordpress.availability_zone
}

output "dns_fqdn" {
  description = "Fully qualified domain name pointing to the WordPress instance"
  value       = aws_route53_record.wordpress.fqdn
}

output "blueprint_id" {
  description = "Blueprint ID used for the instance"
  value       = aws_lightsail_instance.wordpress.blueprint_id
}

output "bundle_id" {
  description = "Bundle ID (instance size) used"
  value       = aws_lightsail_instance.wordpress.bundle_id
}
