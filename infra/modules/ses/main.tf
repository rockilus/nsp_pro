# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "main" {
  count  = var.enable_dkim ? 1 : 0
  domain = aws_ses_domain_identity.main.domain
}

# SES Email Identity (optional, for specific sender addresses)
resource "aws_ses_email_identity" "sender" {
  count = var.domain_name != "" ? 1 : 0
  email = var.domain_name
}

# SES Configuration Set for tracking and monitoring
resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-${var.environment}-ses-config"
  #   name = "my-first-configuration-set"

  reputation_metrics_enabled = true
  sending_enabled            = true
}

# CloudWatch event destination for tracking delivery
# resource "aws_ses_event_destination" "cloudwatch" {
#   name                   = "${var.project_name}-${var.environment}-ses-events"
#   configuration_set_name = aws_ses_configuration_set.main.name
#   enabled                = true
#   matching_types         = ["send", "reject", "bounce", "complaint", "delivery"]

#   cloudwatch_destination {
#     default_value  = "default"
#     dimension_name = "ses:configuration-set"
#     value_source   = "messageTag"
#   }
# }
