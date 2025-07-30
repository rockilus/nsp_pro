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
      name = var.main_service_container_name
      # name  = "main-service"
      image = "${var.main_service_ecr_repository_url}:latest"

      portMappings = [
        {
          name          = "backend-image-4000-tcp"
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

      environment = []

      environmentFiles = [
        {
          type  = "s3"
          value = "arn:aws:s3:::nsp-pro-bucket/.env"
        },
      ]

      secrets = [
        {
          name      = "DB_URI"
          valueFrom = var.documentdb_secret_arn
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
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.main_service.name
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
    cpu_architecture        = var.main_service_cpu_architecture
    operating_system_family = var.main_service_operating_system_family
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
  family = "backend-solve-service-task"
  # family                   = "${var.project_name}-${var.environment}-solve-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.solve_service_cpu
  memory                   = var.solve_service_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn
  enable_fault_injection   = false

  container_definitions = jsonencode([
    {
      name = "solve-service-image"
      # name  = "solve-service"
      image = "${var.solve_service_ecr_repository_url}:latest"

      portMappings = [
        {
          name          = "solve-service-port-80"
          appProtocol   = "http"
          containerPort = var.solve_service_port
          hostPort      = var.solve_service_port
          protocol      = "tcp"
        }
      ]

      environment = []

      environmentFiles = [
        {
          type  = "s3"
          value = "arn:aws:s3:::nsp-pro-bucket/.data_fetcher.env"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.solve_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "max-buffer-size"       = "25m"
          "mode"                  = "non-blocking"
        }
        secretOptions = []
      }

      secrets = [
        {
          name      = "DB_URI"
          valueFrom = var.documentdb_secret_arn
        },
      ]

      mountPoints    = []
      systemControls = []
      ulimits        = []
      volumesFrom    = []

      # healthCheck = {
      #   command     = ["CMD-SHELL", "curl -f http://localhost:${var.solve_service_port}/health || exit 1"]
      #   interval    = 30
      #   timeout     = 5
      #   retries     = 3
      #   startPeriod = 60
      # }

      essential = true
    }
  ])

  runtime_platform {
    cpu_architecture        = var.solve_service_cpu_architecture
    operating_system_family = var.solve_service_operating_system_family
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-solve-service-task"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "SolveService"
  # })
}

# Permit PDP Task Definition
resource "aws_ecs_task_definition" "permit_pdp" {
  family = "backend-permit-pdp-task"
  # family                   = "${var.project_name}-${var.environment}-permit-pdp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.permit_pdp_cpu
  memory                   = var.permit_pdp_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn
  enable_fault_injection   = false

  container_definitions = jsonencode([
    {
      name = "permit-pdp-image"
      # name  = "permit-pdp"
      image = "permitio/pdp-v2:latest"

      portMappings = [
        {
          appProtocol   = "http"
          name          = "permit-image-7000-tcp"
          containerPort = var.permit_pdp_port
          hostPort      = var.permit_pdp_port
          protocol      = "tcp"
        }
      ]

      environment      = []
      environmentFiles = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.permit_pdp.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "max-buffer-size"       = "25m"
          "mode"                  = "non-blocking"
        }
        secretOptions = []
      }

      mountPoints = []

      secrets = [
        {
          name      = "PDP_API_KEY"
          valueFrom = var.permit_api_key_secret_arn
        },
      ]

      # healthCheck = {
      #   command     = ["CMD-SHELL", "curl -f http://localhost:${var.permit_pdp_port}/v1/health || exit 1"]
      #   interval    = 30
      #   timeout     = 5
      #   retries     = 3
      #   startPeriod = 60
      # }

      systemControls = []
      ulimits        = []
      volumesFrom    = []

      essential = true
    }
  ])

  runtime_platform {
    cpu_architecture        = var.solve_service_cpu_architecture
    operating_system_family = var.solve_service_operating_system_family
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-permit-pdp-task"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "PermitPDP"
  # })
}

# Main Service ECS Service
resource "aws_ecs_service" "main_service" {
  name = "main-service"
  # name                              = "${var.project_name}-${var.environment}-main-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main_service.id
  desired_count   = var.main_service_desired_count
  # launch_type                       = "FARGATE"
  availability_zone_rebalancing     = "ENABLED"
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 0
  propagate_tags                    = "NONE"
  iam_role                          = "/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
  # iam_role                          = aws_iam_role.ecs_service_role.arn

  alarms {
    alarm_names = []
    enable      = false
    rollback    = false
  }

  capacity_provider_strategy {
    base              = 0
    capacity_provider = "FARGATE"
    weight            = 1
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  load_balancer {
    container_name   = var.main_service_container_name
    container_port   = var.main_service_port
    elb_name         = null
    target_group_arn = var.nlb_target_group_arn
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_private_dns_namespace.main.arn

    service {
      discovery_name        = "main-service-backend"
      ingress_port_override = 0
      port_name             = "backend-image-4000-tcp"

      client_alias {
        dns_name = "main-service"
        port     = var.main_service_port
      }
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.main_service_security_group_id]
    assign_public_ip = true
  }

  # network_configuration {
  #   assign_public_ip = true
  #   security_groups = [
  #     "sg-0bdbfd43e719c644f",
  #   ]
  #   subnets = [
  #     "subnet-03ec39fe769f6c0c0",
  #     "subnet-06501787d97c3e5b4",
  #     "subnet-08ab5a474d2b109f0",
  #   ]
  # }

  # service_registries {
  #   registry_arn = aws_service_discovery_service.main_service.arn
  # }


  tags = {}
  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-main-service"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "MainService"
  # })

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role_policy]
}

# Solve Service ECS Service
resource "aws_ecs_service" "solve_service" {
  name = "solve-service"
  # name            = "${var.project_name}-${var.environment}-solve-service"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.solve_service.arn
  desired_count                     = var.solve_service_desired_count
  availability_zone_rebalancing     = "ENABLED"
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 0
  iam_role                          = "/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
  propagate_tags                    = "NONE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.solve_service_security_group_id]
    assign_public_ip = true
  }

  # network_configuration {
  #   assign_public_ip = true -> false
  #   security_groups  = [
  #       "sg-0ce1fa8e7ef12ca02",
  #     ] 
  # }

  alarms {
    alarm_names = []
    enable      = false
    rollback    = false
  }

  capacity_provider_strategy {
    base              = 0
    capacity_provider = "FARGATE"
    weight            = 1
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-solve-service"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "SolveService"
  # })

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role_policy]
}

# Permit PDP ECS Service
resource "aws_ecs_service" "permit_pdp" {
  name = "permit-pdp"
  # name                              = "${var.project_name}-${var.environment}-permit-pdp"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.permit_pdp.arn
  desired_count                     = var.permit_pdp_desired_count
  availability_zone_rebalancing     = "ENABLED"
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 0
  iam_role                          = "/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
  propagate_tags                    = "NONE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.permit_pdp_security_group_id]
    assign_public_ip = true
  }

  alarms {
    alarm_names = []
    enable      = false
    rollback    = false
  }

  capacity_provider_strategy {
    base              = 0
    capacity_provider = "FARGATE"
    weight            = 1
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  # network_configuration {
  #     assign_public_ip = true -> false
  #     security_groups  = [
  #         "sg-03edf2d02c7467810",
  #       ] -> (known after apply)
  #       # (1 unchanged attribute hidden)
  #   }

  service_connect_configuration {
    enabled   = true
    namespace = "arn:aws:servicediscovery:eu-west-3:590183915149:namespace/ns-yzprnzaq4ctfdqvt"

    log_configuration {
      log_driver = "awslogs"
      options = {
        "awslogs-create-group"  = "true"
        "awslogs-group"         = "/ecs/permit-pdp"
        "awslogs-region"        = "eu-west-3"
        "awslogs-stream-prefix" = "ecs"
      }
    }

    service {
      discovery_name        = "permit-pdp-service"
      ingress_port_override = 0
      port_name             = "permit-image-7000-tcp"

      client_alias {
        dns_name = "permit-pdp"
        port     = 7000
      }
    }
  }

  tags = {}
  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-permit-pdp"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "PermitPDP"
  # })

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role_policy]
}
