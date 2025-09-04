# ECS Cluster Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# Task Definition Outputs
output "main_service_task_definition_arn" {
  description = "ARN of the main service task definition"
  value       = aws_ecs_task_definition.main_service.arn
}

output "solve_service_task_definition_arn" {
  description = "ARN of the solve service task definition"
  value       = aws_ecs_task_definition.solve_service.arn
}

output "permit_pdp_task_definition_arn" {
  description = "ARN of the Permit PDP task definition"
  value       = aws_ecs_task_definition.permit_pdp.arn
}

# Service Outputs
output "main_service_service_id" {
  description = "ID of the main service ECS service"
  value       = aws_ecs_service.main_service.id
}

output "solve_service_service_id" {
  description = "ID of the solve service ECS service"
  value       = aws_ecs_service.solve_service.id
}

output "permit_pdp_service_id" {
  description = "ID of the Permit PDP ECS service"
  value       = aws_ecs_service.permit_pdp.id
}

# IAM Role Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_execution_role_name" {
  description = "Name of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.name
}

# Service Discovery Outputs
output "service_discovery_namespace_id" {
  description = "ID of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_name" {
  description = "Name of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

# output "main_service_discovery_service_id" {
#   description = "ID of the main service discovery service"
#   value       = aws_service_discovery_service.main_service.id
# }

# output "permit_pdp_discovery_service_id" {
#   description = "ID of the Permit PDP service discovery service"
#   value       = aws_service_discovery_service.permit_pdp.id
# }

# CloudWatch Log Group Outputs
output "main_service_log_group_name" {
  description = "Name of the main service CloudWatch log group"
  value       = aws_cloudwatch_log_group.main_service.name
}

output "solve_service_log_group_name" {
  description = "Name of the solve service CloudWatch log group"
  value       = aws_cloudwatch_log_group.solve_service.name
}

output "permit_pdp_log_group_name" {
  description = "Name of the Permit PDP CloudWatch log group"
  value       = aws_cloudwatch_log_group.permit_pdp.name
}

# Service URLs (for internal communication)
output "main_service_internal_url" {
  description = "Internal URL for the main service"
  value       = "http://main-service.${aws_service_discovery_private_dns_namespace.main.name}:${var.main_service_port}"
}

output "permit_pdp_internal_url" {
  description = "Internal URL for the Permit PDP service"
  value       = "http://permit-pdp.${aws_service_discovery_private_dns_namespace.main.name}:${var.permit_pdp_port}"
}

# Combined deployment information
output "ecs_deployment_info" {
  description = "ECS deployment information for CI/CD"
  value = {
    cluster_name                     = aws_ecs_cluster.main.name
    main_service_task_definition     = aws_ecs_task_definition.main_service.family
    solve_service_task_definition    = aws_ecs_task_definition.solve_service.family
    permit_pdp_task_definition       = aws_ecs_task_definition.permit_pdp.family
    main_service_service_name        = aws_ecs_service.main_service.name
    solve_service_service_name       = aws_ecs_service.solve_service.name
    permit_pdp_service_name          = aws_ecs_service.permit_pdp.name
    execution_role_arn               = aws_iam_role.ecs_task_execution_role.arn
    service_discovery_namespace_name = aws_service_discovery_private_dns_namespace.main.name
  }
  sensitive = false
}
