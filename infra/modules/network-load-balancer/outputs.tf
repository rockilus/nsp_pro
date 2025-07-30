output "nlb_arn" {
  description = "ARN of the Network Load Balancer"
  value       = aws_lb.api_nlb.arn
}

output "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer"
  value       = aws_lb.api_nlb.dns_name
}

output "nlb_zone_id" {
  description = "Zone ID of the Network Load Balancer"
  value       = aws_lb.api_nlb.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.api_backend.arn
}

output "nlb_security_group_id" {
  description = "Security group ID for the Network Load Balancer"
  value       = aws_security_group.nlb.id
}


output "vpc_link_target_arns" {
  description = "Target ARNs for VPC Link (NLB ARN)"
  value       = [aws_lb.api_nlb.arn]
}

output "vpc_link_endpoint_url" {
  description = "Endpoint URL for VPC Link"
  value       = "http://${aws_lb.api_nlb.dns_name}:${var.backend_port}"
}
