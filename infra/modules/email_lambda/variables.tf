variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., prod, staging, dev)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for SES and other services"
  type        = string
  default     = "eu-west-3"
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue that triggers the Lambda"
  type        = string
}

variable "s3_templates_bucket_name" {
  description = "Name of the S3 bucket containing email templates"
  type        = string
}

variable "s3_templates_bucket_arn" {
  description = "ARN of the S3 bucket containing email templates"
  type        = string
}

variable "ses_from_email" {
  description = "Email address to send emails from"
  type        = string
  default     = "noreply@rockilus.com"
}

variable "ses_configuration_set" {
  description = "SES configuration set name for tracking"
  type        = string
  default     = ""
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
