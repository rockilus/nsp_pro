resource "aws_sqs_queue" "email_dlq" {
  name                       = "${var.project_name}-${var.environment}-email-dlq"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KiB
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 60

  # KMS encryption for compliance
  # Use customer KMS key when provided, otherwise omit the attribute so
  # `sqs_managed_sse_enabled` can be used to enable SQS-managed SSE.
  kms_master_key_id                 = var.kms_key_id != "" ? var.kms_key_id : null
  kms_data_key_reuse_period_seconds = 300

  # Enable SQS-managed SSE only when no customer KMS key provided. Use null
  # to omit the attribute when a KMS key is used (avoids conflict).
  sqs_managed_sse_enabled = var.kms_key_id == "" ? true : null

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-email-dlq"
    }
  )
}

resource "aws_sqs_queue" "email_queue" {
  name                       = "${var.project_name}-${var.environment}-email-queue"
  delay_seconds              = 0
  max_message_size           = 262144 # 256 KiB
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = var.visibility_timeout_seconds

  # Redrive policy for error handling
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  # KMS encryption for compliance
  # Use customer KMS key when provided, otherwise omit the attribute so
  # `sqs_managed_sse_enabled` can be used to enable SQS-managed SSE.
  kms_master_key_id                 = var.kms_key_id != "" ? var.kms_key_id : null
  kms_data_key_reuse_period_seconds = 300

  # Enable SQS-managed SSE only when no customer KMS key provided. Use null
  # to omit the attribute when a KMS key is used (avoids conflict).
  sqs_managed_sse_enabled = var.kms_key_id == "" ? true : null

  # Set up CloudWatch Alarms for queue monitoring
  depends_on = [aws_sqs_queue.email_dlq]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-email-queue"
    }
  )
}

# CloudWatch alarm for DLQ messages (monitoring for failed emails)
resource "aws_cloudwatch_metric_alarm" "dlq_messages_visible" {
  alarm_name          = "${var.project_name}-${var.environment}-email-dlq-messages-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "This alarm monitors for messages in the email DLQ, which may indicate email sending failures"
  alarm_actions       = var.alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.email_dlq.name
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-email-dlq-messages-alarm"
    }
  )
}

# SQS Queue Policy to restrict access to specified services
resource "aws_sqs_queue_policy" "email_queue_policy" {
  queue_url = aws_sqs_queue.email_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "${var.project_name}-${var.environment}-email-queue-policy"
    Statement = [
      {
        Sid    = "AllowSendReceiveFromServices"
        Effect = "Allow"
        Principal = {
          AWS = var.allowed_principal_arns
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.email_queue.arn
      }
    ]
  })
}

# SQS DLQ Policy
resource "aws_sqs_queue_policy" "email_dlq_policy" {
  queue_url = aws_sqs_queue.email_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "${var.project_name}-${var.environment}-email-dlq-policy"
    Statement = [
      {
        Sid    = "AllowSendReceiveFromServices"
        Effect = "Allow"
        Principal = {
          AWS = var.allowed_principal_arns
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.email_dlq.arn
      }
    ]
  })
}
