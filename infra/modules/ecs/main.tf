# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "rockilus-dev-architecture-jun2025"
  # name = "${var.project_name}-${var.environment}-cluster"

  # configuration {
  #   execute_command_configuration {
  #     logging = "OVERRIDE"
  #     log_configuration {
  #       cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_cluster.name
  #     }
  #   }
  # }

  # Healthcare compliance - enable container insights
  setting {
    name  = "containerInsights"
    value = "disabled"
    # value = "enabled"
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-cluster"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Purpose     = "ContainerOrchestration"
  # })
}

# CloudWatch Log Group for ECS Cluster
resource "aws_cloudwatch_log_group" "ecs_cluster" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-cluster"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cluster-logs"
    Component   = "CloudWatch"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  })
}

# CloudWatch Log Groups for Services
resource "aws_cloudwatch_log_group" "main_service" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-main-service"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-main-service-logs"
    Component   = "CloudWatch"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "MainService"
  })
}

resource "aws_cloudwatch_log_group" "solve_service" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-solve-service"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-solve-service-logs"
    Component   = "CloudWatch"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "SolveService"
  })
}

resource "aws_cloudwatch_log_group" "permit_pdp" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}-permit-pdp"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-permit-pdp-logs"
    Component   = "CloudWatch"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "PermitPDP"
  })
}

# IAM Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "nsp_pro-ecs-task-role"
  # name = "${var.project_name}-${var.environment}-ecs-task-execution-role"
  description = "Allows ECS tasks to call AWS services on your behalf."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-ecs-task-execution-role"
  #   Component   = "IAM"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Purpose     = "ECSTaskExecution"
  # })
}

# Attach the Amazon ECS task execution role policy
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for ECR access
resource "aws_iam_role_policy" "ecs_task_execution_ecr_policy" {
  name = "${var.project_name}-${var.environment}-ecs-ecr-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/aws/ecs/*"
      }
    ]
  })
}

# IAM Role for ECS Service
resource "aws_iam_role" "ecs_service_role" {
  name        = "AWSServiceRoleForECS"
  description = "Role to enable Amazon ECS to manage your cluster."
  path        = "/aws-service-role/ecs.amazonaws.com/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs.amazonaws.com"
        }
      }
    ]
  })

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-ecs-service-role"
  #   Component   = "IAM"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Purpose     = "ECSServiceRole"
  # })
}

# Security Group for Main Service
resource "aws_security_group" "main_service" {
  name = "backend-security-group"
  # name_prefix = "${var.project_name}-${var.environment}-main-service-"
  description = "backend security group"
  # description = "Security group for ${var.project_name} ${var.environment} main service"
  vpc_id = var.vpc_id

  ingress {
    cidr_blocks = [
      "0.0.0.0/0",
    ]
    from_port        = 443
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = []
    self             = false
    to_port          = 443
  }

  ingress {
    cidr_blocks      = []
    from_port        = var.main_service_port
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = var.nlb_security_group_ids
    self             = false
    to_port          = var.main_service_port
  }

  # # Allow inbound traffic from NLB
  # ingress {
  #   description     = "Traffic from Network Load Balancer"
  #   from_port       = var.main_service_port
  #   to_port         = var.main_service_port
  #   protocol        = "tcp"
  #   security_groups = var.nlb_security_group_ids
  # }

  # # Allow internal service communication
  # ingress {
  #   description = "Internal service communication"
  #   from_port   = var.main_service_port
  #   to_port     = var.main_service_port
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # Outbound rules for database and external services
  egress {
    cidr_blocks = [
      "0.0.0.0/0",
    ]
    from_port        = 0
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "-1"
    security_groups  = []
    self             = false
    to_port          = 0
  }

  # egress {
  #   description = "MongoDB/DocumentDB communication"
  #   from_port   = 27017
  #   to_port     = 27017
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # egress {
  #   description = "Redis communication"
  #   from_port   = 6379
  #   to_port     = 6379
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # egress {
  #   description = "HTTPS for AWS services"
  #   from_port   = 443
  #   to_port     = 443
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # egress {
  #   description = "Permit.io PDP communication"
  #   from_port   = 7000
  #   to_port     = 7000
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-main-service-sg"
  #   Component   = "SecurityGroup"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "MainService"
  # })

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for Solve Service
resource "aws_security_group" "solve_service" {
  name = "backend-solveservice-sg"
  # name_prefix = "${var.project_name}-${var.environment}-solve-service-"
  description = "Backend solve service june 2025 architecture"
  # description = "Security group for ${var.project_name} ${var.environment} solve service"
  vpc_id = var.vpc_id

  # Allow internal service communication
  # ingress {
  #   description = "Internal service communication"
  #   from_port   = var.solve_service_port
  #   to_port     = var.solve_service_port
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # Outbound rules for database and external services
  egress {
    cidr_blocks = [
      "0.0.0.0/0",
    ]
    from_port        = 0
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "-1"
    security_groups  = []
    self             = false
    to_port          = 0
  }

  # egress {
  #   description = "MongoDB/DocumentDB communication"
  #   from_port   = 27017
  #   to_port     = 27017
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # egress {
  #   description = "Redis communication"
  #   from_port   = 6379
  #   to_port     = 6379
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  # egress {
  #   description = "HTTPS for AWS services"
  #   from_port   = 443
  #   to_port     = 443
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-solve-service-sg"
  #   Component   = "SecurityGroup"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "SolveService"
  # })

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for Permit PDP
resource "aws_security_group" "permit_pdp" {
  name = "nsp_pro-permit_pdp_sg"
  # name_prefix = "${var.project_name}-${var.environment}-permit-pdp-"
  description = "Allow load balancer access to the permit pdp container"
  # description = "Security group for ${var.project_name} ${var.environment} Permit.io PDP service"
  vpc_id = var.vpc_id

  ingress {
    cidr_blocks = [
      "0.0.0.0/0",
    ]
    from_port        = var.permit_pdp_port
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups = [
      aws_security_group.main_service.id,
    ]
    self    = false
    to_port = var.permit_pdp_port
  }

  # # Allow inbound traffic from main service
  # ingress {
  #   description     = "Traffic from main service"
  #   from_port       = 7000
  #   to_port         = 7000
  #   protocol        = "tcp"
  #   security_groups = [aws_security_group.main_service.id]
  # }

  # # Allow internal service communication
  # ingress {
  #   description = "Internal service communication"
  #   from_port   = 7000
  #   to_port     = 7000
  #   protocol    = "tcp"
  #   cidr_blocks = [var.vpc_cidr_block]
  # }

  egress {
    cidr_blocks = [
      "0.0.0.0/0",
    ]
    description      = "Required to fetch secrets at vpc endpoint"
    from_port        = 443
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = []
    self             = false
    to_port          = 443
  }

  # egress {
  #   description = "HTTPS for Permit.io cloud sync"
  #   from_port   = 443
  #   to_port     = 443
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # egress {
  #   description = "HTTP for health checks"
  #   from_port   = 80
  #   to_port     = 80
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-permit-pdp-sg"
  #   Component   = "SecurityGroup"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "PermitPDP"
  # })

  lifecycle {
    create_before_destroy = true
  }
}

# Service Discovery Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "rockilus-namespace-jun2025"
  description = "Rockilus namespace June 2025 architecture"
  # name        = "${var.project_name}-${var.environment}.local"
  # description = "Service discovery namespace for ${var.project_name} ${var.environment}"
  vpc = var.vpc_id

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-namespace"
  #   Component   = "ServiceDiscovery"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  # })
}

# Service Discovery Service for Main Service
resource "aws_service_discovery_service" "main_service" {
  name = "main-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-main-service-discovery"
    Component   = "ServiceDiscovery"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "MainService"
  })
}

# Service Discovery Service for Permit PDP
resource "aws_service_discovery_service" "permit_pdp" {
  name = "permit-pdp"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-permit-pdp-discovery"
    Component   = "ServiceDiscovery"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "PermitPDP"
  })
}
