# Security Group Outputs
output "main_service_security_group_id" {
  description = "ID of the main service security group"
  value       = aws_security_group.main_service.id
}

output "main_service_security_group_arn" {
  description = "ARN of the main service security group"
  value       = aws_security_group.main_service.arn
}

output "solve_service_security_group_id" {
  description = "ID of the solve service security group"
  value       = aws_security_group.solve_service.id
}

output "solve_service_security_group_arn" {
  description = "ARN of the solve service security group"
  value       = aws_security_group.solve_service.arn
}

output "permit_pdp_security_group_id" {
  description = "ID of the Permit PDP security group"
  value       = aws_security_group.permit_pdp.id
}

output "permit_pdp_security_group_arn" {
  description = "ARN of the Permit PDP security group"
  value       = aws_security_group.permit_pdp.arn
}

# Combined security group information
output "security_groups" {
  description = "Map of all security group IDs"
  value = {
    main_service  = aws_security_group.main_service.id
    solve_service = aws_security_group.solve_service.id
    permit_pdp    = aws_security_group.permit_pdp.id
  }
}
