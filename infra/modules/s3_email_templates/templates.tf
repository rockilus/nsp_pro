# Template file discovery and upload configuration

locals {
  templates_path = "${path.module}/templates"
  template_files = fileset(local.templates_path, "**/*.{html,css}")
}

# Render template files with optional variables (logo_url) then upload
locals {
  rendered_templates = {
    for f in local.template_files : f => templatefile("${local.templates_path}/${f}", {
      logo_url     = var.logo_url
      project_name = var.project_name
      environment  = var.environment
    })
  }
}

resource "aws_s3_object" "email_templates" {
  for_each = local.template_files

  bucket       = aws_s3_bucket.email_templates.id
  key          = each.value
  content      = local.rendered_templates[each.value]
  content_type = endswith(each.value, ".css") ? "text/css" : "text/html"
  etag         = md5(local.rendered_templates[each.value])

  tags = merge(
    var.tags,
    {
      Name        = "email-template-${each.value}"
      Environment = var.environment
      Project     = var.project_name
    }
  )
}
