output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution IAM role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_execution_role_name" {
  description = "Name of the ECS task execution IAM role"
  value       = aws_iam_role.ecs_task_execution_role.name
}

# output "ecs_task_role_arn" {
#   description = "ARN of the ECS task IAM role"
#   value       = aws_iam_role.ecs_task_role.arn
# }

# output "ecs_task_role_name" {
#   description = "Name of the ECS task IAM role"
#   value       = aws_iam_role.ecs_task_role.name
# }

output "main_service_task_role_arn" {
  description = "ARN of the main service task IAM role"
  value       = aws_iam_role.main_service_task_role.arn
}

output "main_service_task_role_name" {
  description = "Name of the main service task IAM role"
  value       = aws_iam_role.main_service_task_role.name
}

output "solve_service_task_role_arn" {
  description = "ARN of the solve service task IAM role"
  value       = aws_iam_role.solve_service_task_role.arn
}

output "solve_service_task_role_name" {
  description = "Name of the solve service task IAM role"
  value       = aws_iam_role.solve_service_task_role.name
}
