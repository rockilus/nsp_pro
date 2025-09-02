# Security Group for Main Service
resource "aws_security_group" "main_service" {
  # name = "backend-security-group"
  name_prefix = "${var.project_name}-${var.environment}-main-service-"
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
  # name = "backend-solveservice-sg"
  name_prefix = "${var.project_name}-${var.environment}-solve-service-"
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
  # name = "nsp_pro-permit_pdp_sg"
  name_prefix = "${var.project_name}-${var.environment}-permit-pdp-"
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




