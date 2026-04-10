output "solve_queue_url" {
  description = "URL of the solve queue"
  value       = aws_sqs_queue.solve_queue.id
}

output "solve_queue_arn" {
  description = "ARN of the solve queue"
  value       = aws_sqs_queue.solve_queue.arn
}

output "solve_dlq_url" {
  description = "URL of the solve dead-letter queue"
  value       = aws_sqs_queue.solve_dlq.id
}

output "solve_dlq_arn" {
  description = "ARN of the solve dead-letter queue"
  value       = aws_sqs_queue.solve_dlq.arn
}

output "solve_queue_name" {
  description = "Name of the solve queue"
  value       = aws_sqs_queue.solve_queue.name
}

output "solve_dlq_name" {
  description = "Name of the solve dead-letter queue"
  value       = aws_sqs_queue.solve_dlq.name
}
