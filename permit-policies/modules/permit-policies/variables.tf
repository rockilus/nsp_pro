variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "permit_project_id" {
  description = "Permit.io Project ID"
  type        = string
}

variable "permit_environment_id" {
  description = "Permit.io Environment ID"
  type        = string
}

# Role permissions variables
variable "leader_permissions" {
  description = "List of permissions for the leader role"
  type        = list(string)
  default = [
    "update-team", "create-link-shift", "read-fixed-assignments", "create-coverage-selector",
    "read-specialties", "update-coverage", "read-assignments-validated", "create-schedule-export",
    "delete-stats-header", "delete-assignment", "solve-schedule", "update-assignment", "update",
    "read-shift-options", "create-team-invitation", "update-dimension", "create-stats-header",
    "read-coverages", "delete-dimension", "read-shifts", "delete-breach", "create-dimension",
    "create-dim-entry", "read", "read-schedules", "read-coverage-selectors", "create-coverage",
    "read-bulk", "update-shift", "delete-coverage", "update-stats-header", "update-worker-property",
    "resend-team-invitation", "delete", "create-worker", "create-assignment", "update-specialty",
    "create-specialty", "delete-shift-demand", "delete-specialty", "delete-dim-entry",
    "create-schedule", "create", "read-team-invitations", "update-link-shift", "read-team",
    "update-coverage-selector", "update-schedule", "read-workers", "delete-link-shift",
    "delete-shift", "delete-fixed-assignment", "update-breach", "update-attribute", "create-shift",
    "remove-user", "update-shift-demand", "update-demand", "delete-coverage-selector",
    "delete-team-invitation", "create-constraint", "update-request", "read-stats", "update-dim-entry",
    "delete-constraint", "validate-schedule", "read-demands", "create-shift-demand", "read-requests",
    "read-schedule-work-times", "update-fixed-assignment", "read-link-shifts", "create-fixed-assignment",
    "delete-worker", "delete-request", "read-dimensions", "read-team-users", "update-worker",
    "read-constraints", "update-constraint", "duplicate-period", "create-demand",
    "read-constraint-templates", "delete-schedule", "read-breaches", "read-assignments",
    "delete-demand", "create-request", "read-shift-demands", "approve-request",
    "deny-request",
    "rescind-request",
  ]
}

variable "member_permissions" {
  description = "List of permissions for the member role"
  type        = list(string)
  default = [
    "read-workers", "update", "read-assignments-validated", "delete-request",
    "create-request", "update-request", "read-requests", "read", "read-shifts",
    "read-shift-options"
  ]
}

variable "member_description" {
  description = "Description for the member role"
  type        = string
  default     = "Team member with limited permissions"
}

variable "owner_permissions" {
  description = "List of permissions for the owner role"
  type        = list(string)
  default = [
    "update", "change-password", "read", "delete", "reject-team-invitation",
    "accept-team-invitation", "create", "read-team-invitations", "leave-team",
    "read-teams", "create-team"
  ]
}

variable "super_admin_enabled" {
  description = "Whether to enable super admin role"
  type        = bool
  default     = true
}

variable "super_admin_permissions" {
  description = "List of permissions for the super admin role"
  type        = list(string)
  default = [
    "team:delete-dim-entry", "request:delete", "team:read-requests", "team:update-shift",
    "team:update-link-shift", "team:update-specialty", "admin:delete-impersonation",
    "user:delete", "team:update-breach", "user:leave-team", "user:reject-team-invitation",
    "team:create-request", "team:delete-link-shift", "team:read-assignments",
    "team:delete-coverage-selector", "team:delete-stats-header", "team:read-dimensions",
    "team:create-worker", "admin:read-dashboard", "team:delete-team-invitation",
    "team:update-coverage", "team:read-breaches", "team:delete-shift", "team:read-workers",
    "team:validate-schedule", "team:read-team", "team:update", "team:update-fixed-assignment",
    "request:update", "user:accept-team-invitation", "team:create-specialty",
    "team:update-worker-property", "team:solve-schedule", "team:read-bulk", "team:update-team",
    "team:update-coverage-selector", "team:delete-assignment", "team:create", "team:delete-request",
    "user:create", "admin:delete-user", "team:read-link-shifts", "team:create-link-shift",
    "team:update-attribute", "user:read-teams", "admin:read-user", "worker:delete",
    "team:update-assignment", "user:create-team", "team:create-constraint", "request:read",
    "team:update-worker", "user:change-password", "team:create-shift", "team:read-team-invitations",
    "team:read-coverage-selectors", "team:read-schedules", "team:read-stats", "team:read-constraints",
    "team:create-dim-entry", "team:read-schedule-work-times", "admin:create-impersonation",
    "team:read-constraint-templates", "team:create-schedule-export", "team:delete-breach",
    "team:delete-demand", "worker:create", "team:create-schedule", "team:create-assignment",
    "team:resend-team-invitation", "team:delete-schedule", "team:read-shifts", "user:update",
    "team:update-request", "team:delete-specialty", "team:create-coverage-selector",
    "team:update-demand", "team:create-team-invitation", "team:delete-worker",
    "team:delete-shift-demand", "team:create-fixed-assignment", "team:create-stats-header",
    "team:create-coverage", "team:delete-constraint", "team:update-stats-header",
    "team:read-specialties", "worker:update", "team:update-schedule", "user:read",
    "team:read-coverages", "team:duplicate-period", "team:delete-fixed-assignment",
    "admin:read-users", "team:delete-dimension", "team:update-dimension", "team:update-shift-demand",
    "team:read-demands", "team:remove-user", "team:read-team-users", "team:read-shift-options",
    "team:read-assignments-validated", "team:read-shift-demands", "team:update-dim-entry",
    "team:delete-coverage", "team:update-constraint", "team:create-shift-demand", "team:read",
    "worker:read", "team:create-demand", "request:create", "team:create-dimension",
    "user:read-team-invitations", "team:delete", "team:read-fixed-assignments", "team:approve-request",
    "team:deny-request", "team:rescind-request"
  ]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
