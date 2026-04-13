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

output "cerbos_pdp_security_group_id" {
  description = "ID of the Cerbos PDP security group"
  value       = aws_security_group.cerbos_pdp.id
}

output "cerbos_pdp_security_group_arn" {
  description = "ARN of the Cerbos PDP security group"
  value       = aws_security_group.cerbos_pdp.arn
}

# Combined security group information
output "security_groups" {
  description = "Map of all security group IDs"
  value = {
    main_service  = aws_security_group.main_service.id
    solve_service = aws_security_group.solve_service.id
    cerbos_pdp    = aws_security_group.cerbos_pdp.id
  }
}
