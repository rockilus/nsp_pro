# Network Load Balancer for API Gateway VPC Link
resource "aws_lb" "api_nlb" {
  name = "apigateway-mainservice-nlb"
  # name               = "${var.project_name}-${var.environment}-api-nlb"
  internal           = true
  load_balancer_type = "network"

  # Use subnet_mapping instead of subnets for more control
  dynamic "subnet_mapping" {
    for_each = var.private_subnet_ids
    content {
      subnet_id = subnet_mapping.value
      # Optionally specify allocation_id for static IPs
      # allocation_id = var.eip_allocation_ids[subnet_mapping.key]
    }
  }

  # Healthcare compliance - enable deletion protection in production
  # enable_deletion_protection = var.environment == "prod" ? true : false
  enable_deletion_protection = false

  # Cross-zone load balancing for high availability
  enable_cross_zone_load_balancing = false

  # tags = merge(
  #   var.tags,
  #   {
  #     Name        = "${var.project_name}-${var.environment}-api-nlb"
  #     Component   = "NetworkLoadBalancer"
  #     Environment = var.environment
  #     Project     = var.project_name
  #     ManagedBy   = "Terraform"
  # })
}

# Target Group for API Gateway backend services
resource "aws_lb_target_group" "api_backend" {
  name = "apigateway-mainservice-nlb-tg-2"
  # name     = "${var.project_name}-${var.environment}-api-tg"
  port        = var.backend_port
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  # Health check configuration for backend services
  health_check {
    enabled             = true
    healthy_threshold   = 5
    interval            = 30
    matcher             = "200-399"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 6
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

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-api-target-group"
  #   Component   = "TargetGroup"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  # })
}

# NLB Listener
resource "aws_lb_listener" "api_backend" {
  load_balancer_arn = aws_lb.api_nlb.arn
  port              = var.backend_port
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_backend.arn
    forward {
      target_group {
        arn    = aws_lb_target_group.api_backend.arn
        weight = 0
      }
    }
  }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-api-listener"
  #   Component   = "Listener"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  # })
}

# Target Group Attachments for existing instances
# resource "aws_lb_target_group_attachment" "api_backend" {
#   count            = length(var.target_instance_ids)
#   target_group_arn = aws_lb_target_group.api_backend.arn
#   target_id        = var.target_instance_ids[count.index]
#   port             = var.backend_port
# }

# Security Group for NLB (minimal rules for NLB)
resource "aws_security_group" "nlb" {
  name = "apigateway-mainservice-nlb-sg"
  # name_prefix = "${var.project_name}-${var.environment}-nlb-"
  description = "Security group for network load balancer between api gateway and main service"
  # description = "Security group for ${var.project_name} ${var.environment} Network Load Balancer"
  vpc_id = var.vpc_id

  ingress {
    cidr_blocks = [
      "0.0.0.0/0",
    ]
    from_port        = 80
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = []
    self             = false
    to_port          = 80
  }

  # # Inbound rules for API Gateway VPC Link
  # ingress {
  #   description = "API Gateway VPC Link traffic"
  #   from_port   = var.backend_port
  #   to_port     = var.backend_port
  #   protocol    = "tcp"
  #   cidr_blocks = var.allowed_cidr_blocks
  # }

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

  # # Outbound rules for backend communication
  # egress {
  #   description = "Backend service communication"
  #   from_port   = var.backend_port
  #   to_port     = var.backend_port
  #   protocol    = "tcp"
  #   cidr_blocks = var.vpc_cidr_blocks
  # }

  # # Healthcare compliance - restrict outbound internet access
  # egress {
  #   description = "HTTPS for health checks and AWS services"
  #   from_port   = 443
  #   to_port     = 443
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # tags = merge(var.tags, {
  #   Name        = "${var.project_name}-${var.environment}-nlb-sg"
  #   Component   = "SecurityGroup"
  #   Environment = var.environment
  #   Project     = var.project_name
  #   ManagedBy   = "Terraform"
  #   Purpose     = "NetworkLoadBalancer"
  # })

  lifecycle {
    create_before_destroy = true
  }
}

