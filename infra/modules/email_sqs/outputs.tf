output "email_queue_url" {
  description = "URL of the email queue"
  value       = aws_sqs_queue.email_queue.id
}

output "email_queue_arn" {
  description = "ARN of the email queue"
  value       = aws_sqs_queue.email_queue.arn
}

output "email_dlq_url" {
  description = "URL of the email dead-letter queue"
  value       = aws_sqs_queue.email_dlq.id
}

output "email_dlq_arn" {
  description = "ARN of the email dead-letter queue"
  value       = aws_sqs_queue.email_dlq.arn
}

output "email_queue_name" {
  description = "Name of the email queue"
  value       = aws_sqs_queue.email_queue.name
}

output "email_dlq_name" {
  description = "Name of the email dead-letter queue"
  value       = aws_sqs_queue.email_dlq.name
}
