# Security Group for Main Service
resource "aws_security_group" "main_service" {
  name_prefix = "${var.project_name}-${var.environment}-main-service-"
  description = "Security group for ${var.project_name} ${var.environment} main service"
  vpc_id      = var.vpc_id

  # HTTPS ingress
  # ingress {
  #   description = "HTTPS traffic"
  #   from_port   = 443
  #   to_port     = 443
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # HTTP ingress
  ingress {
    description = "HTTP traffic"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-main-service-sg"
    Component   = "SecurityGroup"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "MainService"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Separate security group rule for NLB traffic to avoid circular dependency
resource "aws_security_group_rule" "main_service_nlb_ingress" {
  type                     = "ingress"
  from_port                = var.main_service_port
  to_port                  = var.main_service_port
  protocol                 = "tcp"
  source_security_group_id = var.nlb_security_group_id
  security_group_id        = aws_security_group.main_service.id
  description              = "Traffic from Network Load Balancer"
}

# Security Group for Solve Service
resource "aws_security_group" "solve_service" {
  name_prefix = "${var.project_name}-${var.environment}-solve-service-"
  description = "Security group for ${var.project_name} ${var.environment} solve service"
  vpc_id      = var.vpc_id

  # All outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-solve-service-sg"
    Component   = "SecurityGroup"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "SolveService"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for Cerbos PDP
resource "aws_security_group" "cerbos_pdp" {
  name_prefix = "${var.project_name}-${var.environment}-cerbos-pdp-"
  description = "Security group for ${var.project_name} ${var.environment} Cerbos PDP service"
  vpc_id      = var.vpc_id

  # All outbound traffic (required for ECR image pulls via NAT gateway)
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cerbos-pdp-sg"
    Component   = "SecurityGroup"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "CerbosPDP"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# gRPC ingress for Cerbos PDP from main service only
resource "aws_security_group_rule" "cerbos_pdp_main_service_ingress" {
  type                     = "ingress"
  from_port                = var.cerbos_pdp_grpc_port
  to_port                  = var.cerbos_pdp_grpc_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.main_service.id
  security_group_id        = aws_security_group.cerbos_pdp.id
  description              = "gRPC traffic from main service"
}




