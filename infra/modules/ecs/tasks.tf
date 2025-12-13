# Add AWS caller identity data source
data "aws_caller_identity" "current" {}

# Main Service Task Definition
resource "aws_ecs_task_definition" "main_service" {
  # family = "nsp_pro-backend-task"
  family                   = "${var.project_name}-${var.environment}-main-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.main_service_cpu
  memory                   = var.main_service_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_execution_role_arn
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


      environment = concat(
        var.main_service_environment_variables,
        [
          {
            name  = "AWS_REGION"
            value = var.aws_region
          },
          {
            name  = "SQS_SOLVE_QUEUE_URL"
            value = var.sqs_solve_queue_url
          },
          {
            name  = "SQS_EMAIL_QUEUE_URL"
            value = var.sqs_email_queue_url
          },
          {
            name  = "DOCUMENTDB_SECRET_NAME"
            value = var.documentdb_secret_name
          },
          {
            name  = "BACKEND_API_KEY_SSM_PARAMETER_NAME"
            value = var.api_gateway_backend_api_key_parameter_name
          },
          {
            name  = "COGNITO_USER_POOL_ID"
            value = var.cognito_user_pool_id
          },
          {
            name  = "COGNITO_CLIENT_ID"
            value = var.cognito_client_id
          }
        ]
      )


      secrets = [
        {
          name      = "DB_URI"
          valueFrom = var.documentdb_secret_arn
        },
        {
          name      = "PDP_API_KEY"
          valueFrom = var.permit_api_key_secret_arn
        },
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
          "max-buffer-size"       = "25m"
          "mode"                  = "non-blocking"
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
  # family = "backend-solve-service-task"
  family                   = "${var.project_name}-${var.environment}-solve-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.solve_service_cpu
  memory                   = var.solve_service_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_execution_role_arn
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

      environment = concat(
        var.solve_service_environment_variables,
        [
          {
            name  = "AWS_REGION"
            value = var.aws_region
          },
          {
            name  = "SQS_SOLVE_QUEUE_URL"
            value = var.sqs_solve_queue_url
          },
          {
            name  = "DOCUMENTDB_SECRET_NAME"
            value = var.documentdb_secret_name
          }
        ]
      )

      # environment = concat(
      #   [
      #     for key, value in var.solve_service_environment_variables : {
      #       name  = key
      #       value = value
      #     }
      #   ],
      #   [
      #     {
      #       name  = "SQS_SOLVE_QUEUE_NAME"
      #       value = var.sqs_solve_queue_name
      #     },
      #     {
      #       name  = "SQS_SOLVE_DLQ_NAME"
      #       value = var.sqs_solve_dlq_name
      #     }
      #   ]
      # )

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
  # family = "backend-permit-pdp-task"
  family                   = "${var.project_name}-${var.environment}-permit-pdp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.permit_pdp_cpu
  memory                   = var.permit_pdp_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_execution_role_arn
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

      environment = []

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


# Target Group for API Gateway backend services
resource "aws_lb_target_group" "api_backend" {
  # name = "apigateway-mainservice-nlb-tg-2"
  # name        = "${var.project_name}-${var.environment}-api-tg"
  name_prefix = "apitg-"
  # port        = var.backend_port
  port        = 4000
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  # Health check configuration for backend services
  health_check {
    enabled             = true
    healthy_threshold   = 5
    interval            = 5
    matcher             = "200-399"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  # Preserve client IP for security and compliance
  preserve_client_ip = false

  # Deregistration delay for graceful shutdown
  deregistration_delay = 300

  stickiness {
    cookie_duration = 0
    enabled         = false
    type            = "source_ip"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-api-target-group"
    Component   = "TargetGroup"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  })
}

# NLB Listener
resource "aws_lb_listener" "api_backend" {
  # load_balancer_arn = aws_lb.api_nlb.arn
  load_balancer_arn = var.nlb_arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_backend.arn
    # forward {
    #   target_group {
    #     arn    = aws_lb_target_group.api_backend.arn
    #     weight = 0
    #   }
    # }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-api-listener"
    Component   = "Listener"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  })
}


# Main Service ECS Service
resource "aws_ecs_service" "main_service" {
  # name = "main-service"
  name            = "${var.project_name}-${var.environment}-main-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main_service.id
  desired_count   = var.main_service_desired_count
  # launch_type                       = "FARGATE"
  availability_zone_rebalancing     = "ENABLED"
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 0
  propagate_tags                    = "NONE"
  # Use the AWS service-linked role for ECS
  # Let ECS use its service-linked role; do not set iam_role explicitly which can
  # conflict with service-linked role requirements.

  # alarms {
  #   alarm_names = []
  #   enable      = false
  #   rollback    = false
  # }

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
    container_name = var.main_service_container_name
    container_port = var.main_service_port
    elb_name       = null
    # target_group_arn = var.nlb_target_group_arn
    target_group_arn = aws_lb_target_group.api_backend.arn
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

  lifecycle {
    replace_triggered_by  = [aws_lb_target_group.api_backend]
    create_before_destroy = false

  }

  tags = {}
  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-main-service"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "MainService"
  # })

  depends_on = [
    aws_lb_target_group.api_backend,
    aws_service_discovery_private_dns_namespace.main,
    # aws_service_discovery_service.main_service
  ]
}

# Solve Service ECS Service
resource "aws_ecs_service" "solve_service" {
  # name = "solve-service"
  name                              = "${var.project_name}-${var.environment}-solve-service"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.solve_service.arn
  desired_count                     = var.solve_service_desired_count
  availability_zone_rebalancing     = "ENABLED"
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 0
  # iam_role                          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
  # iam_role removed to allow ECS to use the service-linked role
  propagate_tags = "NONE"

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

  # alarms {
  #   alarm_names = []
  #   enable      = false
  #   rollback    = false
  # }

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

  lifecycle {
    create_before_destroy = false
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-solve-service"
  #   Component   = "ECS"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Service     = "SolveService"
  # })

}

# Permit PDP ECS Service
resource "aws_ecs_service" "permit_pdp" {
  # name = "permit-pdp"
  name                              = "${var.project_name}-${var.environment}-permit-pdp"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.permit_pdp.arn
  desired_count                     = var.permit_pdp_desired_count
  availability_zone_rebalancing     = "ENABLED"
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 0
  # iam_role                          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
  # iam_role removed to allow ECS to use the service-linked role
  propagate_tags = "NONE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.permit_pdp_security_group_id]
    assign_public_ip = true
  }

  # alarms {
  #   alarm_names = []
  #   enable      = false
  #   rollback    = false
  # }

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
    namespace = aws_service_discovery_private_dns_namespace.main.arn

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

  lifecycle {
    create_before_destroy = false
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

  depends_on = [
    aws_service_discovery_private_dns_namespace.main,
    # aws_service_discovery_service.permit_pdp
  ]
}
