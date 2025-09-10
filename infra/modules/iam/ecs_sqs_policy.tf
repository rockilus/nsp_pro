# SQS permissions for the ECS task execution role
resource "aws_iam_policy" "ecs_task_execution_sqs_policy" {
  name        = "${var.project_name}-${var.environment}-ecs-task-execution-sqs-policy"
  description = "Allow ECS tasks to interact with SQS queues"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Main service permissions - send messages to solve queue
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.solve_queue_arn != "" ? var.solve_queue_arn : "*"
      },
      # Solve service permissions - receive and process messages
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = var.solve_queue_arn != "" ? var.solve_queue_arn : "*"
      },
      # Solve service permissions for DLQ
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.solve_dlq_arn != "" ? var.solve_dlq_arn : "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-ecs-task-execution-sqs-policy"
    Component   = "IAM"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Purpose     = "ECSTaskSQSAccess"
  })
}
