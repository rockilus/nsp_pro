# DocumentDB Module

This module creates an AWS DocumentDB cluster for the NSP Pro healthcare scheduling application. DocumentDB provides a MongoDB-compatible database service with enterprise-grade security, scalability, and reliability.

## Features

- **High Availability**: Multi-AZ deployment with automatic failover
- **Security**: TLS encryption in transit and at rest, VPC isolation
- **Compliance**: Healthcare-grade logging and audit capabilities
- **Monitoring**: CloudWatch integration with audit and profiler logs
- **Backup**: Automated backups with configurable retention
- **Secrets Management**: Credentials stored securely in AWS Secrets Manager

## Resources Created

### Core Resources
- **DocumentDB Cluster**: Main database cluster with 2+ instances
- **DocumentDB Instances**: Individual database instances for high availability
- **Subnet Group**: Network configuration for multi-AZ deployment
- **Parameter Group**: Custom configuration for TLS, audit logging, and profiling

### Security
- **Security Group**: Restricts access to authorized ECS services only
- **Secrets Manager Secret**: Stores database credentials securely
- **KMS Encryption**: Encrypts data at rest (optional custom key)

### Monitoring & Logging
- **CloudWatch Log Groups**: Separate groups for audit and profiler logs
- **Performance Insights**: Enhanced monitoring for query performance

## Usage

```hcl
module "documentdb" {
  source = "../../modules/documentdb"

  project_name           = "nsp-pro"
  environment           = "prod"
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  allowed_security_group_ids = [
    module.ecs.main_service_security_group_id,
    module.ecs.solve_service_security_group_id
  ]

  # Production configuration
  instance_class          = "db.r5.large"
  instance_count         = 3
  backup_retention_period = 30
  deletion_protection    = true
  
  # Healthcare compliance
  log_retention_days     = 90
  replica_region        = "us-west-2"

  tags = {
    Environment = "prod"
    Project     = "NSP Pro"
    Compliance  = "Healthcare"
  }
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `project_name` | Name of the project | `string` | n/a | yes |
| `environment` | Environment name | `string` | n/a | yes |
| `vpc_id` | VPC ID | `string` | n/a | yes |
| `private_subnet_ids` | Private subnet IDs | `list(string)` | n/a | yes |
| `allowed_security_group_ids` | Security groups allowed access | `list(string)` | n/a | yes |
| `master_username` | Master username | `string` | `"docdbadmin"` | no |
| `engine_version` | DocumentDB engine version | `string` | `"5.0.0"` | no |
| `instance_class` | Instance class | `string` | `"db.r5.large"` | no |
| `instance_count` | Number of instances | `number` | `2` | no |
| `backup_retention_period` | Backup retention days | `number` | `30` | no |
| `deletion_protection` | Enable deletion protection | `bool` | `true` | no |

## Outputs

| Name | Description | Sensitive |
|------|-------------|-----------|
| `cluster_endpoint` | Primary cluster endpoint | no |
| `cluster_reader_endpoint` | Read-only endpoint | no |
| `credentials_secret_arn` | Credentials secret ARN | no |
| `connection_uri` | MongoDB connection string | yes |
| `security_group_id` | Security group ID | no |

## Security Considerations

### Network Security
- Deployed in private subnets only
- Security group restricts access to ECS services
- No direct internet access

### Data Security
- TLS encryption enforced for all connections
- Encryption at rest using AWS KMS
- Audit logging enabled for compliance

### Access Control
- Master credentials stored in Secrets Manager
- IAM-based access control for administrative operations
- Security group-based network access control

## Compliance Features

### Healthcare Requirements
- **Audit Logging**: All database operations logged
- **Data Encryption**: Both in transit and at rest
- **Backup Retention**: Configurable up to 35 days
- **Access Monitoring**: CloudWatch integration

### Monitoring
- **Performance Insights**: Query-level performance metrics
- **CloudWatch Logs**: Separate audit and profiler streams
- **Automated Backups**: Point-in-time recovery capability

## Connection Example

After deployment, your applications can connect using the connection string from the secret:

```python
import boto3
import json
import pymongo

# Retrieve connection details from Secrets Manager
secrets_client = boto3.client('secretsmanager')
secret_value = secrets_client.get_secret_value(
    SecretId='nsp-pro/prod/documentdb/credentials'
)
db_config = json.loads(secret_value['SecretString'])

# Connect to DocumentDB
client = pymongo.MongoClient(
    db_config['connection_uri'],
    ssl=True,
    ssl_ca_certs='global-bundle.pem'
)
```

## Maintenance

### Backups
- Automated daily backups during the preferred window
- Point-in-time recovery available
- Cross-region backup replication for disaster recovery

### Updates
- Engine updates applied during maintenance windows
- Parameter group changes require instance restart
- Instance scaling can be performed with minimal downtime

### Monitoring
- Monitor CloudWatch metrics for performance
- Review audit logs for security compliance
- Set up alarms for critical metrics (CPU, connections, storage)

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Verify security group rules
   - Check VPC routing configuration
   - Ensure TLS certificates are properly configured

2. **Authentication Failures**
   - Verify credentials in Secrets Manager
   - Check connection string format
   - Ensure TLS is enabled in client configuration

3. **Performance Issues**
   - Review profiler logs in CloudWatch
   - Monitor Performance Insights metrics
   - Consider scaling instance class or count

### Useful Commands

```bash
# Test connectivity from ECS task
aws ecs execute-command --cluster <cluster> --task <task> --command "nc -zv <endpoint> 27017"

# View audit logs
aws logs describe-log-streams --log-group-name "/aws/docdb/<cluster>/audit"

# Check cluster status
aws docdb describe-db-clusters --db-cluster-identifier <cluster-id>
```
