# Security Group for Main Service
resource "aws_security_group" "main_service" {
  name_prefix = "${var.project_name}-${var.environment}-main-service-"
  description = "Security group for ${var.project_name} ${var.environment} main service"
  vpc_id      = var.vpc_id

  # HTTPS ingress
  ingress {
    description = "HTTPS traffic"
    from_port   = 443
    to_port     = 443
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
  count                    = length(var.nlb_security_group_ids)
  type                     = "ingress"
  from_port                = var.main_service_port
  to_port                  = var.main_service_port
  protocol                 = "tcp"
  source_security_group_id = var.nlb_security_group_ids[count.index]
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

# Security Group for Permit PDP
resource "aws_security_group" "permit_pdp" {
  name_prefix = "${var.project_name}-${var.environment}-permit-pdp-"
  description = "Security group for ${var.project_name} ${var.environment} Permit.io PDP service"
  vpc_id      = var.vpc_id

  # HTTPS egress for AWS services and Permit.io cloud sync
  egress {
    description = "HTTPS for AWS services and Permit.io"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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

# Separate rule for Permit PDP ingress from main service
resource "aws_security_group_rule" "permit_pdp_main_service_ingress" {
  type                     = "ingress"
  from_port                = var.permit_pdp_port
  to_port                  = var.permit_pdp_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.main_service.id
  security_group_id        = aws_security_group.permit_pdp.id
  description              = "Traffic from main service"
}

# Allow traffic from anywhere to permit PDP (if needed)
resource "aws_security_group_rule" "permit_pdp_external_ingress" {
  type              = "ingress"
  from_port         = var.permit_pdp_port
  to_port           = var.permit_pdp_port
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.permit_pdp.id
  description       = "External traffic to Permit PDP"
}




