output "cluster_id" {
  description = "DocumentDB cluster identifier"
  value       = aws_docdb_cluster.main.id
}

output "cluster_arn" {
  description = "DocumentDB cluster ARN"
  value       = aws_docdb_cluster.main.arn
}

output "cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = aws_docdb_cluster.main.reader_endpoint
}

output "cluster_port" {
  description = "DocumentDB cluster port"
  value       = aws_docdb_cluster.main.port
}

output "cluster_master_username" {
  description = "DocumentDB cluster master username"
  value       = aws_docdb_cluster.main.master_username
  sensitive   = true
}

output "security_group_id" {
  description = "Security group ID for DocumentDB cluster"
  value       = aws_security_group.docdb.id
}

output "subnet_group_name" {
  description = "DocumentDB subnet group name"
  value       = aws_docdb_subnet_group.main.name
}

output "parameter_group_name" {
  description = "DocumentDB parameter group name"
  value       = aws_docdb_cluster_parameter_group.main.name
}

output "credentials_secret_arn" {
  description = "ARN of the secret containing DocumentDB credentials"
  value       = aws_secretsmanager_secret.docdb_credentials.arn
}

output "credentials_secret_name" {
  description = "Name of the secret containing DocumentDB credentials"
  value       = aws_secretsmanager_secret.docdb_credentials.name
}

output "connection_uri" {
  description = "MongoDB-compatible connection URI for the DocumentDB cluster"
  value       = "mongodb://${aws_docdb_cluster.main.master_username}:${random_password.docdb_master_password.result}@${aws_docdb_cluster.main.endpoint}:${aws_docdb_cluster.main.port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  sensitive   = true
}

output "instance_endpoints" {
  description = "List of DocumentDB instance endpoints"
  value       = aws_docdb_cluster_instance.cluster_instances[*].endpoint
}

output "instance_arns" {
  description = "List of DocumentDB instance ARNs"
  value       = aws_docdb_cluster_instance.cluster_instances[*].arn
}

output "cloudwatch_log_group_audit_name" {
  description = "Name of the CloudWatch log group for audit logs"
  value       = aws_cloudwatch_log_group.docdb_audit.name
}

output "cloudwatch_log_group_profiler_name" {
  description = "Name of the CloudWatch log group for profiler logs"
  value       = aws_cloudwatch_log_group.docdb_profiler.name
}
