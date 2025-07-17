# Create the API Gateway

# REST API Gateway configuration for proxy+ with Cognito authorizer, VPC link, and CORS

# Generate a secure API key for service authentication
resource "random_password" "backend_api_key" {
  length  = 32
  special = false # Avoid special chars for easier header handling
  upper   = true
  lower   = true
  numeric = true
}

# Store API key securely
resource "aws_ssm_parameter" "backend_api_key" {
  name  = "/${var.project_name}/${var.environment}/backend-api-key"
  type  = "SecureString"
  value = random_password.backend_api_key.result

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api-gateway-${var.environment}"
  description = "REST API Gateway for ${var.project_name} in ${var.environment}, receive request from fontend and pass them through to the main service in the backend"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name        = "${var.project_name}-cognito-authorizer-${var.environment}"
  rest_api_id = aws_api_gateway_rest_api.main.id
  #   authorizer_uri         = "arn:aws:apigateway:${var.aws_region}:cognito-idp:path/userpools/${var.cognito_user_pool_id}/authorizers"
  authorizer_credentials = null
  type                   = "COGNITO_USER_POOLS"
  provider_arns          = ["arn:aws:cognito-idp:${var.aws_region}:${local.effective_account_id}:userpool/${var.cognito_user_pool_id}"]
  identity_source        = "method.request.header.Authorization"
}

# VPC Link
resource "aws_api_gateway_vpc_link" "main" {
  count       = var.environment == "prod" ? 1 : 0
  name        = "apigateway-nlb-vpc-link"
  description = "VPC Link to connect the API Gateway to the network load balancer"
  target_arns = var.vpc_link_target_arns
}

# Proxy resource (/{proxy+})
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method on proxy
resource "aws_api_gateway_method" "any_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.proxy"               = true
    "method.request.header.X-Forwarded-For"   = false
    "method.request.header.X-Forwarded-Host"  = false
    "method.request.header.X-Forwarded-Proto" = false
  }
}

resource "aws_api_gateway_method_response" "any_proxy_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.any_proxy.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Credentials" = false
    "method.response.header.Access-Control-Allow-Headers"     = false
    "method.response.header.Access-Control-Allow-Methods"     = false
    "method.response.header.Access-Control-Allow-Origin"      = false
  }
}

resource "aws_api_gateway_method_response" "any_proxy_401" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.any_proxy.http_method
  status_code = "401"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Credentials" = false
    "method.response.header.Access-Control-Allow-Headers"     = false
    "method.response.header.Access-Control-Allow-Methods"     = false
    "method.response.header.Access-Control-Allow-Origin"      = false
  }
}

# Integration for ANY method
resource "aws_api_gateway_integration" "any_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.any_proxy.http_method
  integration_http_method = "ANY"
  # type                    = var.environment == "prod" ? "HTTP_PROXY" : "HTTP"
  type                 = "HTTP_PROXY"
  uri                  = var.vpc_link_endpoint_url
  connection_type      = var.environment == "prod" ? "VPC_LINK" : "INTERNET"
  connection_id        = var.environment == "prod" ? aws_api_gateway_vpc_link.main[0].id : null
  passthrough_behavior = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.path.proxy"               = "method.request.path.proxy"
    "integration.request.header.X-Forwarded-For"   = "method.request.header.X-Forwarded-For"
    "integration.request.header.X-Forwarded-Host"  = "context.domainName"
    "integration.request.header.X-Forwarded-Proto" = "method.request.header.X-Forwarded-Proto"
    # Service authentication
    "integration.request.header.X-API-Key" = "'${random_password.backend_api_key.result}'"
    # User context from Cognito
    "integration.request.header.X-User-Sub"    = "context.authorizer.claims.sub"
    "integration.request.header.X-User-Email"  = "context.authorizer.claims.email"
    "integration.request.header.X-User-Groups" = "context.authorizer.claims['cognito:groups']"
    # Request metadata
    "integration.request.header.X-Request-ID" = "context.requestId"
    "integration.request.header.X-Source-IP"  = "context.identity.sourceIp"
  }
}

resource "aws_api_gateway_integration_response" "any_proxy_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.any_proxy.http_method
  status_code = "200"

  response_templates = {
    "application/json" = ""
  }

  depends_on = [
    aws_api_gateway_integration.any_proxy
  ]

  # response_parameters = {
  #   "method.response.header.Access-Control-Allow-Origin" = "'*'"
  # }
}


# OPTIONS method for CORS
resource "aws_api_gateway_method" "options_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options_proxy.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  # integration_http_method = "OPTIONS"
  passthrough_behavior = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_method_response" "options_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options_proxy.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = false
    "method.response.header.Access-Control-Allow-Methods"     = false
    "method.response.header.Access-Control-Allow-Origin"      = false
    "method.response.header.Access-Control-Allow-Credentials" = false
  }
}

resource "aws_api_gateway_integration_response" "options_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options_proxy.http_method
  status_code = aws_api_gateway_method_response.options_proxy.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,fdi-version,rid,st-auth-mode'"
    "method.response.header.Access-Control-Allow-Methods"     = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"      = "'${join(",", var.cors_allowed_origins)}'"
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  depends_on = [
    aws_api_gateway_integration.options_proxy
  ]
}

# Default gateway responses

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"      = "'${join(",", var.cors_allowed_origins)}'"
    "gatewayresponse.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,anti-csrf,fdi-version,rid,st-auth-mode,authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods"     = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "gatewayresponse.header.Access-Control-Allow-Credentials" = "'true'"
  }

  response_templates = {
    "application/json" = <<EOF
{"message":$context.error.messageString}
EOF
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"      = "'${join(",", var.cors_allowed_origins)}'"
    "gatewayresponse.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,anti-csrf,fdi-version,rid,st-auth-mode,authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods"     = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "gatewayresponse.header.Access-Control-Allow-Credentials" = "'true'"
  }

  response_templates = {
    "application/json" = <<EOF
{"message":$context.error.messageString}
EOF
  }
}

# Deployment and Stage
resource "aws_api_gateway_deployment" "main" {
  depends_on  = [aws_api_gateway_integration.any_proxy]
  rest_api_id = aws_api_gateway_rest_api.main.id
  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.main.id))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.main.id
  rest_api_id          = aws_api_gateway_rest_api.main.id
  stage_name           = var.api_gateway_stage_name
  xray_tracing_enabled = true
}

# Data source for account id
# data "aws_caller_identity" "current" {}

data "aws_caller_identity" "current" {
  count = var.environment == "prod" ? 1 : 0
}

locals {
  effective_account_id = var.environment == "prod" ? data.aws_caller_identity.current[0].account_id : var.aws_account_id
}

# Custom Domain Name (conditional)
resource "aws_api_gateway_domain_name" "custom" {
  count       = var.custom_domain_name != null ? 1 : 0
  domain_name = var.custom_domain_name

  regional_certificate_arn = var.certificate_arn

  security_policy = "TLS_1_2" # Healthcare compliance requirement
  endpoint_configuration {
    types = [var.endpoint_type]
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "API Gateway Custom Domain"
    Compliance  = "Healthcare"
    ManagedBy   = "Terraform"
  }
}

# Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "custom" {
  count       = var.custom_domain_name != null ? 1 : 0
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.custom[0].domain_name

  depends_on = [aws_api_gateway_domain_name.custom, aws_api_gateway_stage.main]
}

# DNS Record for Custom Domain (conditional)
resource "aws_route53_record" "api_domain" {
  count   = var.custom_domain_name != null && var.hosted_zone_id != null ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.custom[0].cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.custom[0].cloudfront_zone_id
    evaluate_target_health = false
  }

  depends_on = [aws_api_gateway_domain_name.custom]
}



