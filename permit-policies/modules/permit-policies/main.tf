terraform {
  required_providers {
    permitio = {
      source  = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

# Resources
resource "permitio_resource" "worker" {
  name        = "Worker"
  description = ""
  key         = "worker"

  actions = {
    "create" = {
      name = "create"
    },
    "read" = {
      name = "read"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    }
  }
  attributes = {
  }
}

resource "permitio_resource" "team" {
  name        = "Team"
  description = ""
  key         = "team"

  actions = {
    "delete-constraint" = {
      name = "delete-constraint"
    },
    "create-constraint" = {
      name = "create-constraint"
    },
    "read-constraint-templates" = {
      name = "read-constraint-templates"
    },
    "read-constraints" = {
      name = "read-constraints"
    },
    "update-constraint" = {
      name = "update-constraint"
    },
    "delete-coverage-selector" = {
      name = "delete-coverage-selector"
    },
    "read-coverage-selectors" = {
      name = "read-coverage-selectors"
    },
    "create-coverage-selector" = {
      name = "create-coverage-selector"
    },
    "update-coverage-selector" = {
      name = "update-coverage-selector"
    },
    "read-fixed-assignments" = {
      name = "read-fixed-assignments"
    },
    "create-fixed-assignment" = {
      name = "create-fixed-assignment"
    },
    "update-fixed-assignment" = {
      name = "update-fixed-assignment"
    },
    "update-request" = {
      name = "update-request"
    },
    "approve-request" = {
      name = "approve-request"
    },
    "deny-request" = {
      name = "deny-request"
    },
    "rescind-request" = {
      name = "rescind-request"
    },
    "read-requests" = {
      name = "read-requests"
    },
    "delete-request" = {
      name = "delete-request"
    },
    "delete-fixed-assignment" = {
      name = "delete-fixed-assignment"
    },
    "create-request" = {
      name = "create-request"
    },
    "read-schedules" = {
      name = "read-schedules"
    },
    "validate-schedule" = {
      name = "validate-schedule"
    },
    "update-schedule" = {
      name = "update-schedule"
    },
    "solve-schedule" = {
      name = "solve-schedule"
    },
    "delete-schedule" = {
      name = "delete-schedule"
    },
    "create-schedule" = {
      name = "create-schedule"
    },
    "read-bulk" = {
      name = "read-bulk"
    },
    "delete-shift" = {
      name = "delete-shift"
    },
    "read-shift-options" = {
      name = "read-shift-options"
    },
    "read-assignments-validated" = {
      name = "read-assignments-validated"
    },
    "update-attribute" = {
      name = "update-attribute"
    },
    "update-breach" = {
      name = "update-breach"
    },
    "delete-breach" = {
      name = "delete-breach"
    },
    "read-breaches" = {
      name = "read-breaches"
    },
    "delete-demand" = {
      name = "delete-demand"
    },
    "create-demand" = {
      name = "create-demand"
    },
    "read-demands" = {
      name = "read-demands"
    },
    "update-demand" = {
      name = "update-demand"
    },
    "delete-dim-entry" = {
      name = "delete-dim-entry"
    },
    "create-dim-entry" = {
      name = "create-dim-entry"
    },
    "update-dim-entry" = {
      name = "update-dim-entry"
    },
    "create-dimension" = {
      name = "create-dimension"
    },
    "update-dimension" = {
      name = "update-dimension"
    },
    "delete-dimension" = {
      name = "delete-dimension"
    },
    "read-dimensions" = {
      name = "read-dimensions"
    },
    "create-schedule-export" = {
      name = "create-schedule-export"
    },
    "delete-specialty" = {
      name = "delete-specialty"
    },
    "create-specialty" = {
      name = "create-specialty"
    },
    "duplicate-period" = {
      name = "duplicate-period"
    },
    "update-specialty" = {
      name = "update-specialty"
    },
    "create-shift" = {
      name = "create-shift"
    },
    "update-shift" = {
      name = "update-shift"
    },
    "read-shifts" = {
      name = "read-shifts"
    },
    "create" = {
      name = "create"
    },
    "read-schedule-work-times" = {
      name = "read-schedule-work-times"
    },
    "read-specialties" = {
      name = "read-specialties"
    },
    "read" = {
      name = "read"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    },
    "create-coverage" = {
      name = "create-coverage"
    },
    "delete-coverage" = {
      name = "delete-coverage"
    },
    "create-shift-demand" = {
      name = "create-shift-demand"
    },
    "read-coverages" = {
      name = "read-coverages"
    },
    "delete-shift-demand" = {
      name = "delete-shift-demand"
    },
    "read-shift-demands" = {
      name = "read-shift-demands"
    },
    "update-shift-demand" = {
      name = "update-shift-demand"
    },
    "update-coverage" = {
      name = "update-coverage"
    },
    "read-assignments" = {
      name = "read-assignments"
    },
    "delete-assignment" = {
      name = "delete-assignment"
    },
    "update-assignment" = {
      name = "update-assignment"
    },
    "create-assignment" = {
      name = "create-assignment"
    },
    "create-swap" = {
      name = "create-swap"
    },
    "read-swap" = {
      name = "read-swap"
    },
    "approve-swap" = {
      name = "approve-swap"
    },
    "create-worker" = {
      name = "create-worker"
    },
    "update-worker" = {
      name = "update-worker"
    },
    "delete-worker" = {
      name = "delete-worker"
    },
    "read-workers" = {
      name = "read-workers"
    },
    "update-worker-property" = {
      name = "update-worker-property"
    },
    "delete-team-invitation" = {
      name = "delete-team-invitation"
    },
    "read-team-invitations" = {
      name = "read-team-invitations"
    },
    "create-team-invitation" = {
      name = "create-team-invitation"
    },
    "resend-team-invitation" = {
      name = "resend-team-invitation"
    },
    "read-team-users" = {
      name = "read-team-users"
    },
    "remove-user" = {
      name = "remove-user"
    },
    "create-stats-header" = {
      name = "create-stats-header"
    },
    "update-stats-header" = {
      name = "update-stats-header"
    },
    "delete-stats-header" = {
      name = "delete-stats-header"
    },
    "read-stats" = {
      name = "read-stats"
    },
    "read-link-shifts" = {
      name = "read-link-shifts"
    },
    "check-replacements" = {
      name = "check-replacements"
    },
    "create-link-shift" = {
      name = "create-link-shift"
    },
    "update-link-shift" = {
      name = "update-link-shift"
    },
    "delete-link-shift" = {
      name = "delete-link-shift"
    },
    "read-team" = {
      name = "read-team"
    },
    "update-team" = {
      name = "update-team"
    }
  }
  attributes = {
  }
}

resource "permitio_resource" "request" {
  name        = "Request"
  description = ""
  key         = "request"

  actions = {
    "create" = {
      name = "create"
    },
    "read" = {
      name = "read"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    }
  }
  attributes = {
    "created_by" = {
      name = "Created By"
      type = "string"
    }
  }
}

resource "permitio_resource" "admin" {
  name        = "Admin"
  description = ""
  key         = "admin"

  actions = {
    "read-users" = {
      name = "read-users"
    },
    "read-user" = {
      name = "read-user"
    },
    "create-impersonation" = {
      name = "create-impersonation"
    },
    "delete-impersonation" = {
      name = "delete-impersonation"
    },
    "delete-user" = {
      name = "delete-user"
    },
    "read-dashboard" = {
      name = "read-dashboard"
    }
  }
  attributes = {
  }
}

resource "permitio_resource" "user" {
  name        = "User"
  description = ""
  key         = "user"

  actions = {
    "change-password" = {
      name = "change-password"
    },
    "create" = {
      name = "create"
    },
    "reject-team-invitation" = {
      name = "reject-team-invitation"
    },
    "accept-team-invitation" = {
      name = "accept-team-invitation"
    },
    "read-team-invitations" = {
      name = "read-team-invitations"
    },
    "create-team" = {
      name = "create-team"
    },
    "read-teams" = {
      name = "read-teams"
    },
    "leave-team" = {
      name = "leave-team"
    },
    "read" = {
      name = "read"
    },
    "update" = {
      name = "update"
    },
    "delete" = {
      name = "delete"
    }
  }
  attributes = {
  }
}

# Roles
resource "permitio_role" "leader" {
  key         = "leader"
  name        = "leader"
  resource    = permitio_resource.team.key
  permissions = var.leader_permissions

  depends_on = [permitio_resource.team]
}

resource "permitio_role" "member" {
  key         = "member"
  name        = "member"
  resource    = permitio_resource.team.key
  permissions = var.member_permissions
  description = var.member_description

  depends_on = [permitio_resource.team]
}

resource "permitio_role" "owner" {
  key         = "owner"
  name        = "owner"
  resource    = permitio_resource.user.key
  permissions = var.owner_permissions

  depends_on = [permitio_resource.user]
}

resource "permitio_role" "super_admin" {
  count       = var.super_admin_enabled ? 1 : 0
  key         = "super_admin"
  name        = "Super admin"
  permissions = var.super_admin_permissions
  description = "Granted all permissions to provide support to clients"

  depends_on = [
    permitio_resource.team,
    permitio_resource.request,
    permitio_resource.admin,
    permitio_resource.user,
    permitio_resource.worker
  ]
}

# Resource Sets
resource "permitio_resource_set" "requests_created_by_the_user" {
  name     = "Requests created by the user"
  key      = "requests_created_by_the_user"
  resource = permitio_resource.request.key
  conditions = jsonencode({
    "allOf" : [
      {
        "allOf" : [
          {
            "resource.created_by" : {
              "equals" : {
                "ref" : "user.key"
              }
            }
          }
        ]
      }
    ]
  })
  depends_on = [
    permitio_resource.request
  ]
}
