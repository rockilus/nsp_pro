# Landing page outputs
output "landing_page_url" {
  description = "Landing page website URL"
  value       = module.landing_page.website_url
}

output "landing_page_cloudfront_domain" {
  description = "CloudFront distribution domain name for the landing page"
  value       = module.landing_page.cloudfront_domain_name
}

output "landing_page_s3_bucket" {
  description = "S3 bucket name for the landing page"
  value       = module.landing_page.s3_bucket_id
}

output "landing_page_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for landing page cache invalidation"
  value       = module.landing_page.cloudfront_distribution_id
}

# VPC outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "nat_gateway_public_ip" {
  description = "Public IP of the NAT Gateway"
  value       = module.vpc.nat_gateway_public_ip
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = module.vpc.availability_zones
}

# API Gateway outputs
output "api_gateway_endpoint" {
  description = "Endpoint configuration for the API Gateway"
  value       = module.api_gateway.api_endpoint
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api_gateway.api_id
}

output "api_gateway_custom_domain_name" {
  description = "Custom domain name for the API Gateway"
  value       = module.api_gateway.custom_domain_name
}

output "api_gateway_custom_domain_cloudfront" {
  description = "CloudFront domain for API Gateway custom domain"
  value       = module.api_gateway.custom_domain_cloudfront_domain
}

# Cognito outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = module.cognito.user_pool_arn
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "cognito_user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = module.cognito.user_pool_endpoint
}

output "cognito_user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.cognito.user_pool_domain
}

# Frontend outputs
output "frontend_url" {
  description = "Frontend website URL"
  value       = module.frontend.website_url
}

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.frontend.cloudfront_domain_name
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend"
  value       = module.frontend.s3_bucket_id
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.frontend.cloudfront_distribution_id
}

output "frontend_deployment_info" {
  description = "Frontend deployment information"
  value = {
    s3_bucket_name             = module.frontend.s3_bucket_id
    cloudfront_distribution_id = module.frontend.cloudfront_distribution_id
    website_url                = module.frontend.website_url
    deployment_role_arn        = module.frontend.deployment_role_arn
  }
  sensitive = false
}

output "cloudfront_certificate_arn" {
  description = "CloudFront SSL certificate ARN (US-East-1)"
  value       = module.route53.cloudfront_certificate_arn
}

output "cloudfront_certificate_status" {
  description = "CloudFront SSL certificate validation status"
  value       = module.route53.cloudfront_certificate_status
}

# SSM Parameter outputs
# output "frontend_config_ssm_parameter" {
#   description = "SSM parameter containing frontend configuration"
#   value       = aws_ssm_parameter.frontend_config.name
# }

# output "frontend_cloudfront_ssm_parameter" {
#   description = "SSM parameter containing CloudFront distribution ID"
#   value       = aws_ssm_parameter.frontend_cloudfront_distribution_id.name
# }

# output "frontend_s3_bucket_ssm_parameter" {
#   description = "SSM parameter containing S3 bucket name"
#   value       = aws_ssm_parameter.frontend_s3_bucket_name.name
# }

# Route 53 outputs (when custom domain is configured)
output "route53_hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = var.frontend_domain_name != null ? module.route53.hosted_zone_id : null
}

output "route53_domain_name" {
  description = "Route 53 domain name"
  value       = var.frontend_domain_name != null ? module.route53.domain_name : null
}

output "route53_name_servers" {
  description = "Route 53 name servers (update these at your domain registrar)"
  value       = var.frontend_domain_name != null ? module.route53.name_servers : null
}

output "ssl_certificate_arn" {
  description = "SSL certificate ARN"
  value       = var.frontend_domain_name != null ? module.route53.certificate_arn : null
}

output "ssl_certificate_status" {
  description = "SSL certificate validation status"
  value       = var.frontend_domain_name != null ? module.route53.certificate_status : null
}

output "dns_deployment_info" {
  description = "DNS and SSL deployment information"
  value = {
    domain_name        = module.route53.domain_name
    hosted_zone_id     = module.route53.hosted_zone_id
    name_servers       = module.route53.name_servers
    certificate_arn    = module.route53.certificate_arn
    certificate_status = module.route53.certificate_status
    # health_check_id is not available in current Route53 module configuration
  }
  sensitive = false
}

# ECR Repository outputs
output "ecr_main_service_repository_url" {
  description = "URL of the main service ECR repository"
  value       = module.ecr.main_service_repository_url
}

output "ecr_solve_service_repository_url" {
  description = "URL of the solve service ECR repository"
  value       = module.ecr.solve_service_repository_url
}

output "ecr_repository_urls" {
  description = "Map of all ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "ecr_repository_arns" {
  description = "Map of all ECR repository ARNs"
  value       = module.ecr.repository_arns
}

output "ecr_deployment_info" {
  description = "ECR deployment information for CI/CD"
  value = {
    main_service_repository_url  = module.ecr.main_service_repository_url
    solve_service_repository_url = module.ecr.solve_service_repository_url
    registry_id                  = module.ecr.main_service_registry_id
    aws_region                   = var.aws_region
  }
  sensitive = false
}

# ECS Cluster and Services outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.ecs_cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.ecs.ecs_cluster_arn
}

output "ecs_main_service_url" {
  description = "Internal URL for the main service"
  value       = module.ecs.main_service_internal_url
}

output "ecs_permit_pdp_url" {
  description = "Internal URL for the Permit PDP service"
  value       = module.ecs.permit_pdp_internal_url
}

output "ecs_service_discovery_namespace" {
  description = "Service discovery namespace name"
  value       = module.ecs.service_discovery_namespace_name
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = module.iam.ecs_task_execution_role_arn
}

output "ecs_deployment_info" {
  description = "ECS deployment information for CI/CD"
  value       = module.ecs.ecs_deployment_info
  sensitive   = false
}

# Secrets Manager outputs
output "permit_api_key_secret_arn" {
  description = "ARN of the Permit.io API key secret"
  value       = data.aws_secretsmanager_secret.permit_api_key.arn
  sensitive   = false
}



# output "secrets_access_role_arn" {
#   description = "ARN of the IAM role for accessing secrets"
#   value       = module.secrets.secrets_access_role_arn
#   sensitive   = false
# }

# output "secrets_audit_log_group_name" {
#   description = "Name of the CloudWatch log group for secrets audit"
#   value       = module.secrets.secrets_audit_log_group_name
#   sensitive   = false
# }

# DocumentDB outputs
output "documentdb_cluster_id" {
  description = "DocumentDB cluster identifier"
  value       = module.documentdb.cluster_id
}

output "documentdb_cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.cluster_endpoint
}

output "documentdb_cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = module.documentdb.cluster_reader_endpoint
}

output "documentdb_security_group_id" {
  description = "Security group ID for DocumentDB cluster"
  value       = module.documentdb.security_group_id
}

output "documentdb_credentials_secret_arn" {
  description = "ARN of the secret containing DocumentDB credentials"
  value       = module.documentdb.credentials_secret_arn
}

output "documentdb_credentials_secret_name" {
  description = "Name of the secret containing DocumentDB credentials"
  value       = module.documentdb.credentials_secret_name
}
