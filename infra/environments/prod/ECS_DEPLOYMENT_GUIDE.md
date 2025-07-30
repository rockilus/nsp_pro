# ECS Deployment Guide for Production

This guide covers deploying the ECS infrastructure for NSP Pro production environment.

## Prerequisites

1. **ECR repositories deployed** with initial container images
2. **VPC and networking infrastructure** in place
3. **Network Load Balancer** configured
4. **Permit.io account** with API credentials
5. **AWS CLI** configured with appropriate permissions
6. **Terraform >= 1.0**

## Required Variables

Add these variables to your `terraform.tfvars` file:

```hcl
# Permit.io Configuration (required)
permit_api_key         = "permit_key_xxxxxxxxxxxxxxxx"
permit_project_id      = "your-project-id-uuid"
permit_environment_id  = "your-environment-id-uuid"

# Service Scaling (optional - defaults provided)
main_service_desired_count  = 2
solve_service_desired_count = 1
permit_pdp_desired_count    = 1

# Environment Variables for Services (optional)
main_service_environment_variables = {
  "DATABASE_URL"           = "mongodb://your-docdb-cluster:27017"
  "REDIS_URL"             = "redis://your-redis-cluster:6379"
  "CELERY_BROKER_URL"     = "redis://your-redis-cluster:6379"
  "LOG_LEVEL"             = "INFO"
  "PERMIT_PDP_ENABLED"    = "true"
}

solve_service_environment_variables = {
  "DATABASE_URL"       = "mongodb://your-docdb-cluster:27017"
  "REDIS_URL"         = "redis://your-redis-cluster:6379"
  "CELERY_BROKER_URL" = "redis://your-redis-cluster:6379"
  "LOG_LEVEL"         = "INFO"
  "SOLVER_THREADS"    = "4"
}
```

## Deployment Steps

### 1. Prepare Container Images

Before deploying ECS, ensure your ECR repositories have the necessary images:

```bash
# Build and push main service image
cd /Users/felipekharaba/Code/nsp_pro
docker build -t main-service -f backend/api_gateway/Dockerfile backend/
docker tag main-service:latest $(terraform output -raw ecr_main_service_repository_url):latest
docker push $(terraform output -raw ecr_main_service_repository_url):latest

# Build and push solve service image
docker build -t solve-service -f backend/solve_service/Dockerfile backend/
docker tag solve-service:latest $(terraform output -raw ecr_solve_service_repository_url):latest
docker push $(terraform output -raw ecr_solve_service_repository_url):latest
```

### 2. Configure Permit.io

Set up your Permit.io configuration:

1. **Create a Permit.io account** at https://permit.io
2. **Create a project** for NSP Pro
3. **Create an environment** (e.g., "production")
4. **Generate an API key** with PDP permissions
5. **Note down the Project ID and Environment ID**

### 3. Deploy ECS Infrastructure

```bash
cd /Users/felipekharaba/Code/nsp_pro/infra/environments/prod

# Initialize if not already done
terraform init

# Plan the deployment
terraform plan -var-file="terraform.tfvars"

# Apply the changes
terraform apply -var-file="terraform.tfvars"
```

### 4. Verify Deployment

```bash
# Check cluster status
aws ecs describe-clusters --clusters $(terraform output -raw ecs_cluster_name)

# Check service status
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services nsp-pro-prod-main-service nsp-pro-prod-solve-service nsp-pro-prod-permit-pdp

# Check task status
aws ecs list-tasks --cluster $(terraform output -raw ecs_cluster_name)
```

## Post-Deployment Configuration

### 1. Verify Service Discovery

Test internal service communication:

```bash
# Get ECS task ARN for main service
TASK_ARN=$(aws ecs list-tasks \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service-name nsp-pro-prod-main-service \
  --query 'taskArns[0]' --output text)

# Execute command in main service container to test Permit PDP connectivity
aws ecs execute-command \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --task $TASK_ARN \
  --container main-service \
  --interactive \
  --command "curl -f http://permit-pdp.nsp-pro-prod.local:7000/v1/health"
```

### 2. Configure Load Balancer Target Group

Update your Network Load Balancer target group to point to the ECS service:

```bash
# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names "apigateway-mainservice-nlb-tg-2" \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# Register ECS service IP addresses (this should be done automatically by ECS)
# The NLB will automatically discover healthy tasks through the target group
```

### 3. Set up Auto Scaling (Optional)

Create auto scaling policies for production workloads:

```bash
# Create auto scaling target for main service
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/$(terraform output -raw ecs_cluster_name)/nsp-pro-prod-main-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy based on CPU utilization
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/$(terraform output -raw ecs_cluster_name)/nsp-pro-prod-main-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

## Monitoring Setup

### 1. CloudWatch Dashboards

Create a custom dashboard for ECS monitoring:

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "NSP-Pro-ECS-Production" \
  --dashboard-body file://ecs-dashboard.json
```

### 2. CloudWatch Alarms

Set up critical alarms:

```bash
# High CPU alarm for main service
aws cloudwatch put-metric-alarm \
  --alarm-name "NSP-Pro-MainService-HighCPU" \
  --alarm-description "Main service CPU usage is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:nsp-pro-alerts \
  --dimensions Name=ServiceName,Value=nsp-pro-prod-main-service Name=ClusterName,Value=$(terraform output -raw ecs_cluster_name)

# Service health alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "NSP-Pro-MainService-UnhealthyTasks" \
  --alarm-description "Main service has unhealthy tasks" \
  --metric-name RunningTaskCount \
  --namespace AWS/ECS \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:nsp-pro-alerts \
  --dimensions Name=ServiceName,Value=nsp-pro-prod-main-service Name=ClusterName,Value=$(terraform output -raw ecs_cluster_name)
```

## CI/CD Integration

### GitHub Actions Deployment

Create `.github/workflows/deploy-ecs.yml`:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECS_CLUSTER: ${{ secrets.ECS_CLUSTER_NAME }}
  
jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to Amazon ECR
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push main service image
      run: |
        docker build -t ${{ secrets.MAIN_SERVICE_ECR_REPO }}:${{ github.sha }} -f backend/api_gateway/Dockerfile backend/
        docker push ${{ secrets.MAIN_SERVICE_ECR_REPO }}:${{ github.sha }}
        
    - name: Build and push solve service image
      run: |
        docker build -t ${{ secrets.SOLVE_SERVICE_ECR_REPO }}:${{ github.sha }} -f backend/solve_service/Dockerfile backend/
        docker push ${{ secrets.SOLVE_SERVICE_ECR_REPO }}:${{ github.sha }}
    
    - name: Update main service
      run: |
        aws ecs update-service \
          --cluster ${{ env.ECS_CLUSTER }} \
          --service nsp-pro-prod-main-service \
          --force-new-deployment
          
    - name: Update solve service
      run: |
        aws ecs update-service \
          --cluster ${{ env.ECS_CLUSTER }} \
          --service nsp-pro-prod-solve-service \
          --force-new-deployment
    
    - name: Wait for deployment
      run: |
        aws ecs wait services-stable \
          --cluster ${{ env.ECS_CLUSTER }} \
          --services nsp-pro-prod-main-service nsp-pro-prod-solve-service
```

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
ECS_CLUSTER_NAME
MAIN_SERVICE_ECR_REPO
SOLVE_SERVICE_ECR_REPO
```

## Security Considerations

### 1. IAM Permissions

Ensure the ECS task execution role has minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Network Security

- All tasks run in private subnets (no public IP)
- Security groups restrict traffic to necessary ports only
- Service discovery uses private DNS resolution
- Permit PDP requires HTTPS outbound for cloud sync

### 3. Secrets Management

Store sensitive configuration in AWS Systems Manager Parameter Store:

```bash
# Store database password
aws ssm put-parameter \
  --name "/nsp-pro/prod/database/password" \
  --value "your-secure-password" \
  --type "SecureString"

# Store Redis auth token
aws ssm put-parameter \
  --name "/nsp-pro/prod/redis/auth-token" \
  --value "your-redis-token" \
  --type "SecureString"
```

## Troubleshooting

### Service Won't Start

1. **Check CloudWatch logs**:
   ```bash
   aws logs tail /aws/ecs/nsp-pro-prod-main-service --follow
   ```

2. **Verify ECR permissions**:
   ```bash
   aws ecr describe-repositories --repository-names nsp-pro-prod-main-service
   aws ecr get-repository-policy --repository-name nsp-pro-prod-main-service
   ```

3. **Check task definition**:
   ```bash
   aws ecs describe-task-definition --task-definition nsp-pro-prod-main-service
   ```

### Service Discovery Issues

1. **Check namespace configuration**:
   ```bash
   aws servicediscovery list-namespaces
   aws servicediscovery list-services --filters Name=NAMESPACE_ID,Values=your-namespace-id
   ```

2. **Test DNS resolution from within a task**:
   ```bash
   aws ecs execute-command \
     --cluster nsp-pro-prod-cluster \
     --task TASK_ARN \
     --container main-service \
     --interactive \
     --command "nslookup permit-pdp.nsp-pro-prod.local"
   ```

### Performance Issues

1. **Monitor CPU and memory usage**:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name CPUUtilization \
     --dimensions Name=ServiceName,Value=nsp-pro-prod-main-service Name=ClusterName,Value=nsp-pro-prod-cluster \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-01T23:59:59Z \
     --period 300 \
     --statistics Average
   ```

2. **Scale services if needed**:
   ```bash
   aws ecs update-service \
     --cluster nsp-pro-prod-cluster \
     --service nsp-pro-prod-main-service \
     --desired-count 4
   ```

## Maintenance

### Rolling Updates

For zero-downtime deployments:

1. Build and push new images to ECR
2. Update task definitions with new image tags
3. Update services to use new task definitions
4. Monitor deployment progress

### Scaling for High Load

Monitor these metrics and scale accordingly:

- **CPU Utilization**: Scale up if consistently > 70%
- **Memory Utilization**: Scale up if consistently > 80%
- **Request Queue Length**: Scale solve service based on Celery queue depth
- **Response Time**: Scale main service if response times increase

### Regular Maintenance Tasks

1. **Review CloudWatch logs** for errors and warnings
2. **Update container images** regularly for security patches
3. **Monitor costs** and optimize resource allocation
4. **Review security groups** and network access patterns
5. **Test disaster recovery** procedures

## Healthcare Compliance Checklist

- ✅ All network traffic within VPC
- ✅ Security groups configured with least privilege
- ✅ CloudWatch logging enabled for audit trails
- ✅ Container insights enabled for monitoring
- ✅ IAM roles with minimal required permissions
- ✅ No hardcoded secrets in task definitions
- ✅ Health checks configured for all services
- ✅ Auto-scaling configured for high availability
- ✅ Encryption in transit (HTTPS/TLS)
- ✅ Regular security updates via container image updates
