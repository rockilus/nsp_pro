# VPC Module for NSP Pro Healthcare Scheduling Application
# Implements production-grade VPC with high availability across 3 AZs

# Data source to get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Main VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Healthcare compliance - enable flow logs
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Component   = "VPC"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Compliance  = "Healthcare"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-igw"
    Component   = "InternetGateway"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  })
}

# Public Subnets (3 across different AZs for high availability)
resource "aws_subnet" "public" {
  count = 3

  vpc_id                          = aws_vpc.main.id
  cidr_block                      = var.public_subnet_cidrs[count.index]
  availability_zone               = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch         = true
  map_customer_owned_ip_on_launch = false
  customer_owned_ipv4_pool        = ""
  outpost_arn                     = ""

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-public-subnet-${count.index + 1}"
    Component   = "PublicSubnet"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Type        = "Public"
    AZ          = data.aws_availability_zones.available.names[count.index]
  })
}

# Private Subnets (3 across different AZs for high availability)
resource "aws_subnet" "private" {
  count = 3

  vpc_id                          = aws_vpc.main.id
  cidr_block                      = var.private_subnet_cidrs[count.index]
  availability_zone               = data.aws_availability_zones.available.names[count.index]
  map_customer_owned_ip_on_launch = false
  customer_owned_ipv4_pool        = ""
  outpost_arn                     = ""

  tags = merge(
    # var.tags, 
    {
      Name        = "${var.project_name}-${var.environment}-private-subnet-${data.aws_availability_zones.available.names[count.index]}"
      Component   = "PrivateSubnet"
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      Type        = "Private"
      AZ          = data.aws_availability_zones.available.names[count.index]
  })
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  # Ensure the VPC exists before creating the EIP
  depends_on = [aws_internet_gateway.main]

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-nat-eip"
    Component   = "ElasticIP"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Purpose     = "NATGateway"
  })
}

# NAT Gateway (placed in the first public subnet for internet access)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(
    # var.tags, 
    {
      Name        = "${var.project_name}-${var.environment}-nat-gateway"
      Component   = "NATGateway"
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
  })

  # Ensure the Internet Gateway exists before creating the NAT Gateway
  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-public-rt"
    Component   = "RouteTable"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Type        = "Public"
  })
}

# Route Table for Private Subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-private-rt"
      Component   = "RouteTable"
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      Type        = "Private"
  })
}

# Associate Public Subnets with Public Route Table
# resource "aws_route_table_association" "public" {
#   count = 3

#   subnet_id      = aws_subnet.public[count.index].id
#   route_table_id = aws_route_table.public.id
# }

# Associate Private Subnets with Private Route Table
resource "aws_route_table_association" "private" {
  count = 3

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# VPC Flow Logs for Healthcare Compliance and Security Monitoring
# resource "aws_flow_log" "vpc_flow_log" {
#   iam_role_arn    = aws_iam_role.flow_log.arn
#   log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
#   traffic_type    = "ALL"
#   vpc_id          = aws_vpc.main.id
# }

# CloudWatch Log Group for VPC Flow Logs
# resource "aws_cloudwatch_log_group" "vpc_flow_log" {
#   name              = "/aws/vpc/flow-logs/${var.project_name}-${var.environment}"
#   retention_in_days = var.environment == "prod" ? 365 : 30

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-vpc-flow-logs"
#     Component   = "CloudWatchLogGroup"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "VPCFlowLogs"
#     Compliance  = "Healthcare"
#   })
# }

# IAM Role for VPC Flow Logs
# resource "aws_iam_role" "flow_log" {
#   name = "${var.project_name}-${var.environment}-vpc-flow-log-role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "vpc-flow-logs.amazonaws.com"
#         }
#       }
#     ]
#   })

#   tags = merge(var.tags, {
#     Name        = "${var.project_name}-${var.environment}-vpc-flow-log-role"
#     Component   = "IAMRole"
#     Environment = var.environment
#     Project     = var.project_name
#     ManagedBy   = "Terraform"
#     Purpose     = "VPCFlowLogs"
#   })
# }

# IAM Policy for VPC Flow Logs
# resource "aws_iam_role_policy" "flow_log" {
#   name = "${var.project_name}-${var.environment}-vpc-flow-log-policy"
#   role = aws_iam_role.flow_log.id

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:PutLogEvents",
#           "logs:DescribeLogGroups",
#           "logs:DescribeLogStreams"
#         ]
#         Effect   = "Allow"
#         Resource = "*"
#       }
#     ]
#   })
# }

# Network ACL for additional security layer (Healthcare compliance)
resource "aws_default_network_acl" "main" {
  #   vpc_id                 = aws_vpc.main.id
  default_network_acl_id = aws_vpc.main.default_network_acl_id

  subnet_ids = flatten([aws_subnet.public[*].id, aws_subnet.private[*].id])

  ingress {
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    icmp_code  = 0
    icmp_type  = 0
    protocol   = "-1"
    rule_no    = 100
    to_port    = 0
  }

  # Allow all inbound traffic from VPC CIDR
  #   ingress {
  #     protocol   = "-1"
  #     rule_no    = 100
  #     action     = "allow"
  #     cidr_block = var.vpc_cidr
  #     from_port  = 0
  #     to_port    = 0
  #   }

  # Allow HTTPS inbound from anywhere (for API Gateway)
  #   ingress {
  #     protocol   = "tcp"
  #     rule_no    = 110
  #     action     = "allow"
  #     cidr_block = "0.0.0.0/0"
  #     from_port  = 443
  #     to_port    = 443
  #   }

  # Allow HTTP inbound from anywhere (for load balancer health checks)
  #   ingress {
  #     protocol   = "tcp"
  #     rule_no    = 120
  #     action     = "allow"
  #     cidr_block = "0.0.0.0/0"
  #     from_port  = 80
  #     to_port    = 80
  #   }

  # Allow ephemeral ports for return traffic
  #   ingress {
  #     protocol   = "tcp"
  #     rule_no    = 130
  #     action     = "allow"
  #     cidr_block = "0.0.0.0/0"
  #     from_port  = 1024
  #     to_port    = 65535
  #   }

  # Allow all outbound traffic
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-nacl"
    Component   = "NetworkACL"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Compliance  = "Healthcare"
  })

  depends_on = [aws_vpc.main]
}
