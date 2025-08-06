# AWS DocumentDB module for NSP Pro
# This module creates a DocumentDB cluster for the healthcare scheduling application

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

# Random password for DocumentDB cluster
resource "random_password" "docdb_master_password" {
  length  = 32
  special = true
  # Avoid characters that might cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# DocumentDB subnet group
resource "aws_docdb_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-docdb-subnet-group"
  description = "DocumentDB subnet group for ${var.project_name} ${var.environment} environment"
  subnet_ids  = var.private_subnet_ids

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-subnet-group"
    Environment = var.environment
    Service     = "DocumentDB"
    Project     = var.project_name
  })
}

# Security group for DocumentDB cluster
resource "aws_security_group" "docdb" {
  name        = "${var.project_name}-${var.environment}-docdb-sg"
  description = "Security group for DocumentDB cluster"
  vpc_id      = var.vpc_id

  # Inbound rules
  ingress {
    description     = "DocumentDB access from ECS services"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  # Outbound rules (DocumentDB typically doesn't need outbound rules)
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-sg"
    Environment = var.environment
    Service     = "DocumentDB"
    Project     = var.project_name
  })
}

# DocumentDB parameter group
resource "aws_docdb_cluster_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-docdb-params"
  description = "DocumentDB cluster parameter group for ${var.project_name} ${var.environment}"
  family      = "docdb5.0"

  # Enable TLS for security compliance
  parameter {
    name  = "tls"
    value = "enabled"
  }

  # Enable audit logging for healthcare compliance
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  # Enable profiler for performance monitoring
  parameter {
    name  = "profiler"
    value = "enabled"
  }

  # Set profiler threshold (log slow operations > 100ms)
  parameter {
    name  = "profiler_threshold_ms"
    value = "100"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-params"
    Environment = var.environment
    Service     = "DocumentDB"
    Project     = var.project_name
  })
}

# DocumentDB cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier        = "${var.project_name}-${var.environment}-docdb-cluster"
  engine                    = "docdb"
  engine_version            = var.engine_version
  master_username           = var.master_username
  master_password           = random_password.docdb_master_password.result
  backup_retention_period   = var.backup_retention_period
  preferred_backup_window   = var.preferred_backup_window
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-docdb-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Network and security configuration
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  # Encryption configuration for healthcare compliance
  storage_encrypted = true
  kms_key_id        = var.kms_key_id

  # Enable deletion protection in production
  deletion_protection = var.deletion_protection

  # Enable CloudWatch logs export for monitoring
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-cluster"
    Environment = var.environment
    Service     = "DocumentDB"
    Project     = var.project_name
    Compliance  = "Healthcare"
  })

  depends_on = [
    aws_docdb_subnet_group.main,
    aws_docdb_cluster_parameter_group.main
  ]
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "cluster_instances" {
  count              = var.instance_count
  identifier         = "${var.project_name}-${var.environment}-docdb-instance-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class

  # Auto minor version upgrade for security patches
  auto_minor_version_upgrade = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-instance-${count.index}"
    Environment = var.environment
    Service     = "DocumentDB"
    Project     = var.project_name
    Instance    = count.index
  })
}

# Store DocumentDB credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "docdb_credentials" {
  name        = "${var.project_name}/${var.environment}/documentdb/credentials"
  description = "DocumentDB cluster credentials for ${var.project_name} ${var.environment} environment"

  # Healthcare compliance configuration
  recovery_window_in_days        = var.recovery_window_in_days
  force_overwrite_replica_secret = false

  # Enable cross-region replication for disaster recovery
  dynamic "replica" {
    for_each = var.replica_region != null ? [1] : []
    content {
      region = var.replica_region
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-credentials"
    Environment = var.environment
    Service     = "DocumentDB"
    SecretType  = "Database Credentials"
    Project     = var.project_name
    Compliance  = "Healthcare"
  })
}

# Store DocumentDB credentials value
resource "aws_secretsmanager_secret_version" "docdb_credentials" {
  secret_id = aws_secretsmanager_secret.docdb_credentials.id
  secret_string = jsonencode({
    username            = aws_docdb_cluster.main.master_username
    password            = random_password.docdb_master_password.result
    engine              = "docdb"
    host                = aws_docdb_cluster.main.endpoint
    port                = aws_docdb_cluster.main.port
    dbClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
    connection_uri      = "mongodb://${aws_docdb_cluster.main.master_username}:${random_password.docdb_master_password.result}@${aws_docdb_cluster.main.endpoint}:${aws_docdb_cluster.main.port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# CloudWatch Log Group for audit logs
resource "aws_cloudwatch_log_group" "docdb_audit" {
  name              = "/aws/docdb/${aws_docdb_cluster.main.cluster_identifier}/audit"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-audit-logs"
    Environment = var.environment
    Service     = "DocumentDB"
    LogType     = "Audit"
    Project     = var.project_name
  })
}

# CloudWatch Log Group for profiler logs
resource "aws_cloudwatch_log_group" "docdb_profiler" {
  name              = "/aws/docdb/${aws_docdb_cluster.main.cluster_identifier}/profiler"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-docdb-profiler-logs"
    Environment = var.environment
    Service     = "DocumentDB"
    LogType     = "Profiler"
    Project     = var.project_name
  })
}
