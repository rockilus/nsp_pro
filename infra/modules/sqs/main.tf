resource "aws_sqs_queue" "solve_dlq" {
  name                       = "${var.project_name}-${var.environment}-solve-dlq"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KiB
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 60

  # KMS encryption for healthcare compliance
  kms_master_key_id                 = var.kms_key_id != "" ? var.kms_key_id : "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  # Enable server-side encryption
  sqs_managed_sse_enabled = var.kms_key_id == "" ? true : false

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-solve-dlq"
    }
  )
}

resource "aws_sqs_queue" "solve_queue" {
  name                       = "${var.project_name}-${var.environment}-solve-queue"
  delay_seconds              = 0
  max_message_size           = 262144 # 256 KiB
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = var.visibility_timeout_seconds

  # Redrive policy for healthcare-compliant error handling
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.solve_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  # KMS encryption for healthcare compliance
  kms_master_key_id                 = var.kms_key_id != "" ? var.kms_key_id : "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  # Enable server-side encryption
  sqs_managed_sse_enabled = var.kms_key_id == "" ? true : false

  # Set up CloudWatch Alarms for queue monitoring
  depends_on = [aws_sqs_queue.solve_dlq]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-solve-queue"
    }
  )
}

# CloudWatch alarm for DLQ messages (healthcare compliance monitoring)
resource "aws_cloudwatch_metric_alarm" "dlq_messages_visible" {
  alarm_name          = "${var.project_name}-${var.environment}-dlq-messages-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "This alarm monitors for messages in the DLQ, which may indicate solve service failures"
  alarm_actions       = var.alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.solve_dlq.name
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-dlq-messages-alarm"
    }
  )
}

# SQS Queue Policy to restrict access to specified services
resource "aws_sqs_queue_policy" "solve_queue_policy" {
  queue_url = aws_sqs_queue.solve_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "${var.project_name}-${var.environment}-solve-queue-policy"
    Statement = [
      {
        Sid    = "AllowSendReceiveFromServices"
        Effect = "Allow"
        Principal = {
          AWS = var.task_execution_role_arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.solve_queue.arn
      }
    ]
  })
}

# SQS DLQ Policy
resource "aws_sqs_queue_policy" "solve_dlq_policy" {
  queue_url = aws_sqs_queue.solve_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "${var.project_name}-${var.environment}-solve-dlq-policy"
    Statement = [
      {
        Sid    = "AllowSendReceiveFromServices"
        Effect = "Allow"
        Principal = {
          AWS = var.task_execution_role_arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.solve_dlq.arn
      }
    ]
  })
}
