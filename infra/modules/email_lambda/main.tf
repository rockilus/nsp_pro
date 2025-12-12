# IAM Role for the Lambda
resource "aws_iam_role" "email_processor_lambda_role" {
  name = "${var.project_name}-email-processor-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-email-processor-role-${var.environment}"
      Environment = var.environment
      Project     = var.project_name
    }
  )
}

# CloudWatch Logs Policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.email_processor_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SES send email policy
resource "aws_iam_role_policy" "ses_send_email" {
  name = "${var.project_name}-email-processor-ses-${var.environment}"
  role = aws_iam_role.email_processor_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from_email
          }
        }
      }
    ]
  })
}

# S3 template read access policy
resource "aws_iam_role_policy" "s3_template_access" {
  name = "${var.project_name}-email-processor-s3-${var.environment}"
  role = aws_iam_role.email_processor_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${var.s3_templates_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketVersioning"
        ]
        Resource = var.s3_templates_bucket_arn
      }
    ]
  })
}

# SQS access policy
resource "aws_iam_role_policy" "sqs_access" {
  name = "${var.project_name}-email-processor-sqs-${var.environment}"
  role = aws_iam_role.email_processor_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

# Archive the Lambda code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_function.py"
  output_path = "${path.module}/email_processor.zip"
}

# The Lambda Function Resource
resource "aws_lambda_function" "email_processor" {
  function_name = "${var.project_name}-email-processor-${var.environment}"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  role          = aws_iam_role.email_processor_lambda_role.arn

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME          = var.project_name
      ENVIRONMENT           = var.environment
      AWS_REGION_CUSTOM     = var.aws_region
      S3_TEMPLATES_BUCKET   = var.s3_templates_bucket_name
      SES_FROM_EMAIL        = var.ses_from_email
      SES_CONFIGURATION_SET = var.ses_configuration_set
    }
  }

  timeout     = 60
  memory_size = 256

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-email-processor-${var.environment}"
      Environment = var.environment
      Project     = var.project_name
    }
  )

  # Ensure Lambda is created after IAM policies
  depends_on = [
    aws_iam_role_policy.ses_send_email,
    aws_iam_role_policy.s3_template_access,
    aws_iam_role_policy.sqs_access,
    aws_iam_role_policy_attachment.lambda_logs
  ]
}

# SQS Event Source Mapping
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.email_processor.arn
  batch_size       = 1
  enabled          = true

  # Function response types for partial batch failures
  function_response_types = ["ReportBatchItemFailures"]

  depends_on = [
    aws_lambda_function.email_processor,
    aws_iam_role_policy.sqs_access
  ]
}
