# Security Group for Main Service
resource "aws_security_group" "main_service" {
  name        = "backend-security-group"
  description = "backend security group"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS for AWS services"
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
    description      = "Traffic from Network Load Balancer"
    cidr_blocks      = []
    from_port        = var.main_service_port
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = var.nlb_security_group_ids
    self             = false
    to_port          = var.main_service_port
  }

  # Outbound rules for database and external services
  egress {
    description = "All outbound traffic"
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

# Security Group for Solve Service
resource "aws_security_group" "solve_service" {
  name        = "backend-solveservice-sg"
  description = "Backend solve service june 2025 architecture"
  vpc_id      = var.vpc_id

  # Outbound rules for database and external services
  egress {
    description = "All outbound traffic"
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

# Security Group for Permit PDP
resource "aws_security_group" "permit_pdp" {
  name        = "nsp_pro-permit_pdp_sg"
  description = "Allow load balancer access to the permit pdp container"
  vpc_id      = var.vpc_id

  ingress {
    description = "Traffic from main service"
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

  egress {
    description = "Required to fetch secrets at vpc endpoint"
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

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-permit-pdp-sg"
    Component   = "SecurityGroup"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Service     = "PermitPDP"
  })

  lifecycle {
    create_before_destroy = true
  }
}
