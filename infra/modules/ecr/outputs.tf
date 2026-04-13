# Main Service ECR Repository Outputs
output "main_service_repository_arn" {
  description = "ARN of the main service ECR repository"
  value       = aws_ecr_repository.main_service.arn
}

output "main_service_repository_name" {
  description = "Name of the main service ECR repository"
  value       = aws_ecr_repository.main_service.name
}

output "main_service_repository_url" {
  description = "URL of the main service ECR repository"
  value       = aws_ecr_repository.main_service.repository_url
}

output "main_service_registry_id" {
  description = "Registry ID where the main service repository was created"
  value       = aws_ecr_repository.main_service.registry_id
}

# Solve Service ECR Repository Outputs
output "solve_service_repository_arn" {
  description = "ARN of the solve service ECR repository"
  value       = aws_ecr_repository.solve_service.arn
}

output "solve_service_repository_name" {
  description = "Name of the solve service ECR repository"
  value       = aws_ecr_repository.solve_service.name
}

output "solve_service_repository_url" {
  description = "URL of the solve service ECR repository"
  value       = aws_ecr_repository.solve_service.repository_url
}

output "solve_service_registry_id" {
  description = "Registry ID where the solve service repository was created"
  value       = aws_ecr_repository.solve_service.registry_id
}

# Cerbos PDP ECR Repository Outputs
output "cerbos_pdp_repository_url" {
  description = "URL of the Cerbos PDP ECR repository"
  value       = aws_ecr_repository.cerbos_pdp.repository_url
}

output "cerbos_pdp_repository_arn" {
  description = "ARN of the Cerbos PDP ECR repository"
  value       = aws_ecr_repository.cerbos_pdp.arn
}

# Combined outputs for convenience
output "repository_urls" {
  description = "Map of all ECR repository URLs"
  value = {
    main_service  = aws_ecr_repository.main_service.repository_url
    solve_service = aws_ecr_repository.solve_service.repository_url
    cerbos_pdp    = aws_ecr_repository.cerbos_pdp.repository_url
  }
}

output "repository_arns" {
  description = "Map of all ECR repository ARNs"
  value = {
    main_service  = aws_ecr_repository.main_service.arn
    solve_service = aws_ecr_repository.solve_service.arn
    cerbos_pdp    = aws_ecr_repository.cerbos_pdp.arn
  }
}
