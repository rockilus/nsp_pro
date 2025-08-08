output "environment" {
  description = "The environment name"
  value       = var.environment
}

output "worker_resource_id" {
  description = "The ID of the worker resource"
  value       = permitio_resource.worker.id
}

output "team_resource_id" {
  description = "The ID of the team resource"
  value       = permitio_resource.team.id
}

output "request_resource_id" {
  description = "The ID of the request resource"
  value       = permitio_resource.request.id
}

output "admin_resource_id" {
  description = "The ID of the admin resource"
  value       = permitio_resource.admin.id
}

output "user_resource_id" {
  description = "The ID of the user resource"
  value       = permitio_resource.user.id
}

output "leader_role_id" {
  description = "The ID of the leader role"
  value       = permitio_role.leader.id
}

output "member_role_id" {
  description = "The ID of the member role"
  value       = permitio_role.member.id
}

output "owner_role_id" {
  description = "The ID of the owner role"
  value       = permitio_role.owner.id
}

output "super_admin_role_id" {
  description = "The ID of the super admin role (if enabled)"
  value       = var.super_admin_enabled ? permitio_role.super_admin[0].id : null
}

output "requests_created_by_user_resource_set_id" {
  description = "The ID of the requests created by user resource set"
  value       = permitio_resource_set.requests_created_by_the_user.id
}
