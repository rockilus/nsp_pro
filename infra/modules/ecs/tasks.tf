# Main Service Task Definition
resource "aws_ecs_task_definition" "main_service" {
  family = "nsp_pro-backend-task"
  # family                   = "${var.project_name}-${var.environment}-main-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.main_service_cpu
  memory                   = var.main_service_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn
  enable_fault_injection   = false

  container_definitions = jsonencode([
    {
      name = "backend-image"
      # name  = "main-service"
      image = "${var.main_service_ecr_repository_url}:latest"

      portMappings = [
        {
          appProtocol   = "http"
          containerPort = var.main_service_port
          hostPort      = var.main_service_port
          protocol      = "tcp"
        }
      ]

      # environment = [
      #   for key, value in merge(var.main_service_environment_variables, {
      #     "ENVIRONMENT"    = var.environment
      #     "AWS_REGION"     = var.aws_region
      #     "PERMIT_PDP_URL" = "http://permit-pdp.${var.project_name}-${var.environment}.local:${var.permit_pdp_port}"
      #     }) : {
      #     name  = key
      #     value = value
      #   }
      # ]

      environmentFiles = [
        {
          type  = "s3"
          value = "arn:aws:s3:::nsp-pro-bucket/.env"
        },
      ]

      secrets = [
        {
          name      = "DB_URI"
          valueFrom = var.atlas_secret_arn
        },
        {
          name      = "PDP_API_KEY"
          valueFrom = var.permit_api_key_secret_arn
        },
        {
          name      = "ST_API_KEY"
          valueFrom = var.st_api_key_secret_arn
        },
        {
          name      = "ST_CONNECTION_URI"
          valueFrom = var.st_connection_uri_secret_arn
        }
      ]

      systemControls = []
      ulimits        = []
      volumesFrom    = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-create-group = true
          awslogs-group        = "/ecs/nsp_pro-backend-task"
          # "awslogs-group"         = aws_cloudwatch_log_group.main_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
        secretOptions = []
      }
      mountPoints = []

      # healthCheck = {
      #   command     = ["CMD-SHELL", "curl -f http://localhost:${var.main_service_port}/health || exit 1"]
      #   interval    = 30
      #   timeout     = 5
      #   retries     = 3
      #   startPeriod = 60
      # }

      essential = true
    }
  ])

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-main-service-task"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "MainService"
  # })
}

# Solve Service Task Definition
resource "aws_ecs_task_definition" "solve_service" {
  family                   = "${var.project_name}-${var.environment}-solve-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.solve_service_cpu
  memory                   = var.solve_service_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "solve-service"
      image = "${var.solve_service_ecr_repository_url}:latest"

      portMappings = [
        {
          containerPort = var.solve_service_port
          hostPort      = var.solve_service_port
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in merge(var.solve_service_environment_variables, {
          "ENVIRONMENT" = var.environment
          "AWS_REGION"  = var.aws_region
          }) : {
          name  = key
          value = value
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.solve_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.solve_service_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-solve-service-task"
    Component   = "ECS"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "SolveService"
  })
}

# Permit PDP Task Definition
resource "aws_ecs_task_definition" "permit_pdp" {
  family                   = "${var.project_name}-${var.environment}-permit-pdp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.permit_pdp_cpu
  memory                   = var.permit_pdp_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "permit-pdp"
      image = "permitio/pdp-v2:latest"

      portMappings = [
        {
          containerPort = var.permit_pdp_port
          hostPort      = var.permit_pdp_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "PDP_API_KEY"
          value = var.permit_api_key
        },
        {
          name  = "PDP_DEBUG"
          value = var.environment == "prod" ? "false" : "true"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.permit_pdp.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.permit_pdp_port}/v1/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-permit-pdp-task"
    Component   = "ECS"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "PermitPDP"
  })
}

# Main Service ECS Service
resource "aws_ecs_service" "main_service" {
  name            = "${var.project_name}-${var.environment}-main-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main_service.arn
  desired_count   = var.main_service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.main_service.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main_service.arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-main-service"
    Component   = "ECS"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "MainService"
  })

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role_policy]
}

# Solve Service ECS Service
resource "aws_ecs_service" "solve_service" {
  name            = "${var.project_name}-${var.environment}-solve-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.solve_service.arn
  desired_count   = var.solve_service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.solve_service.id]
    assign_public_ip = false
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-solve-service"
    Component   = "ECS"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "SolveService"
  })

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role_policy]
}

# Permit PDP ECS Service
resource "aws_ecs_service" "permit_pdp" {
  name            = "${var.project_name}-${var.environment}-permit-pdp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.permit_pdp.arn
  desired_count   = var.permit_pdp_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.permit_pdp.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.permit_pdp.arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-permit-pdp"
    Component   = "ECS"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "PermitPDP"
  })

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role_policy]
}
