# Template file discovery and upload configuration

locals {
  templates_path = "${path.module}/templates"
  template_files = fileset(local.templates_path, "**/*.{html,css}")
}

# Upload all email templates to S3
resource "aws_s3_object" "email_templates" {
  for_each = local.template_files

  bucket       = aws_s3_bucket.email_templates.id
  key          = each.value
  source       = "${local.templates_path}/${each.value}"
  content_type = endswith(each.value, ".css") ? "text/css" : "text/html"
  etag         = filemd5("${local.templates_path}/${each.value}")

  tags = merge(
    var.tags,
    {
      Name        = "email-template-${each.value}"
      Environment = var.environment
      Project     = var.project_name
    }
  )
}
