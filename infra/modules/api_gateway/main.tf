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

# Grant the ECS task execution role permission to read the SSM parameters used
# for backend/internal API keys so tasks running in ECS can authenticate to
# the backend when proxying requests through the API Gateway.
resource "aws_iam_role_policy" "ecs_task_execution_ssm_parameters" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution-ssm"
  role = var.task_execution_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:DescribeParameters",
          "kms:Decrypt"
        ]
        Resource = [
          aws_ssm_parameter.backend_api_key.arn,
          aws_ssm_parameter.internal_api_key.arn
        ]
      }
    ]
  })
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api-gateway-${var.environment}"
  description = "REST API Gateway for ${var.project_name} in ${var.environment}, receive request from fontend and pass them through to the main service in the backend"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  binary_media_types = ["multipart/form-data"]
}

# VPC Link
resource "aws_api_gateway_vpc_link" "main" {
  # name        = "apigateway-nlb-vpc-link"
  name        = "${var.project_name}-vpc-link-${var.environment}"
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
  authorization = "NONE"
  request_parameters = {
    "method.request.path.proxy"                   = true
    "method.request.header.X-Forwarded-For"       = false
    "method.request.header.X-Forwarded-Host"      = false
    "method.request.header.X-Forwarded-Proto"     = false
    "method.request.header.X-Impersonation-Token" = false
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
  type                    = "HTTP_PROXY"
  uri                     = "${var.vpc_link_endpoint_url}/{proxy}"
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.main.id
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.path.proxy"               = "method.request.path.proxy"
    "integration.request.header.X-Forwarded-For"   = "method.request.header.X-Forwarded-For"
    "integration.request.header.X-Forwarded-Host"  = "context.domainName"
    "integration.request.header.X-Forwarded-Proto" = "method.request.header.X-Forwarded-Proto"
    # Service authentication
    "integration.request.header.X-API-Key" = "'${random_password.backend_api_key.result}'"
    # Request metadata
    "integration.request.header.X-Request-ID" = "context.requestId"
    "integration.request.header.X-Source-IP"  = "context.identity.sourceIp"
    # Forward impersonation token if provided by client
    "integration.request.header.X-Impersonation-Token" = "method.request.header.X-Impersonation-Token"
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
  # "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,fdi-version,rid,st-auth-mode,X-Impersonation-Token'"
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
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,fdi-version,rid,st-auth-mode,X-Impersonation-Token'"
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
    "gatewayresponse.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,anti-csrf,fdi-version,rid,st-auth-mode,X-Impersonation-Token,authorization'"
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
    "gatewayresponse.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,anti-csrf,fdi-version,rid,st-auth-mode,X-Impersonation-Token,authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods"     = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "gatewayresponse.header.Access-Control-Allow-Credentials" = "'true'"
  }

  response_templates = {
    "application/json" = <<EOF
{"message":$context.error.messageString}
EOF
  }
}



###########################################
# Internal Service Communication
###########################################

# Generate separate API key for internal services (Lambda → API Gateway)
resource "random_password" "internal_api_key" {
  length  = 32
  special = true
  numeric = true
  upper   = true
  lower   = true

  lifecycle {
    ignore_changes = [length, special, numeric, upper, lower]
  }
}

# Store internal API key in SSM Parameter Store
resource "aws_ssm_parameter" "internal_api_key" {
  name        = "/${var.project_name}/${var.environment}/internal-api-key"
  description = "API key for internal service communication (Lambda to API Gateway)"
  type        = "SecureString"
  value       = random_password.internal_api_key.result

  tags = {
    Name        = "${var.project_name}-internal-api-key-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "internal-service-auth"
  }
}

# API Gateway API key resource for internal services
resource "aws_api_gateway_api_key" "internal" {
  name        = "${var.project_name}-internal-${var.environment}"
  description = "API key for internal service communication"
  value       = random_password.internal_api_key.result

  tags = {
    Name        = "${var.project_name}-internal-api-key-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Usage plan for internal API key with appropriate limits
resource "aws_api_gateway_usage_plan" "internal" {
  name        = "${var.project_name}-internal-${var.environment}"
  description = "Usage plan for internal services"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  # Conservative limits for internal services
  # Changer a la seconde ou a la minute: 10/secondes
  quota_settings {
    limit  = 10000 # 10k requests per day
    period = "DAY"
  }

  throttle_settings {
    rate_limit  = 100 # 100 requests per second
    burst_limit = 200 # 200 burst limit
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Link internal API key to usage plan
resource "aws_api_gateway_usage_plan_key" "internal" {
  key_id        = aws_api_gateway_api_key.internal.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.internal.id
}

###########################################
# Internal Endpoints
###########################################

# /internal resource
resource "aws_api_gateway_resource" "internal" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "internal"
}

# /internal/onboard resource
resource "aws_api_gateway_resource" "internal_onboard" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.internal.id
  path_part   = "onboard"
}

# POST method for /internal/onboard (no Cognito auth, API key required)
resource "aws_api_gateway_method" "internal_onboard_post" {
  rest_api_id      = aws_api_gateway_rest_api.main.id
  resource_id      = aws_api_gateway_resource.internal_onboard.id
  http_method      = "POST"
  authorization    = "NONE" # No Cognito authorizer
  api_key_required = true   # Require API key instead

  request_parameters = {
    "method.request.header.X-API-Key" = true  # Required internal API key
    "method.request.header.X-Service" = false # Optional service identifier
  }
}

# Method responses for internal onboard
resource "aws_api_gateway_method_response" "internal_onboard_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.internal_onboard.id
  http_method = aws_api_gateway_method.internal_onboard_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = false
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_method_response" "internal_onboard_400" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.internal_onboard.id
  http_method = aws_api_gateway_method.internal_onboard_post.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = false
  }
}

resource "aws_api_gateway_method_response" "internal_onboard_401" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.internal_onboard.id
  http_method = aws_api_gateway_method.internal_onboard_post.http_method
  status_code = "401"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = false
  }
}

resource "aws_api_gateway_method_response" "internal_onboard_500" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.internal_onboard.id
  http_method = aws_api_gateway_method.internal_onboard_post.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = false
  }
}

# Integration for internal onboard - HTTP_PROXY to existing backend /users/onboard endpoint
resource "aws_api_gateway_integration" "internal_onboard" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.internal_onboard.id
  http_method             = aws_api_gateway_method.internal_onboard_post.http_method
  integration_http_method = "POST"
  type                    = "HTTP_PROXY"
  # Fix: Remove {proxy+} from URI to avoid "Illegal character in path" error
  uri                  = "${var.vpc_link_endpoint_url}/users/onboard"
  connection_type      = "VPC_LINK"
  connection_id        = aws_api_gateway_vpc_link.main.id
  passthrough_behavior = "WHEN_NO_TEMPLATES"

  request_parameters = {
    # Backend service authentication (same as regular endpoints)
    "integration.request.header.X-API-Key" = "'${random_password.backend_api_key.result}'"
    # Forward service identifier and metadata
    "integration.request.header.X-Service"       = "method.request.header.X-Service"
    "integration.request.header.X-Forwarded-For" = "context.identity.sourceIp"
    "integration.request.header.X-Request-ID"    = "context.requestId"
  }

  depends_on = [aws_api_gateway_method.internal_onboard_post]
}

# Integration responses for internal onboard
resource "aws_api_gateway_integration_response" "internal_onboard_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.internal_onboard.id
  http_method = aws_api_gateway_method.internal_onboard_post.http_method
  status_code = aws_api_gateway_method_response.internal_onboard_200.status_code

  depends_on = [aws_api_gateway_integration.internal_onboard]
}

resource "aws_api_gateway_integration_response" "internal_onboard_400" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.internal_onboard.id
  http_method       = aws_api_gateway_method.internal_onboard_post.http_method
  status_code       = aws_api_gateway_method_response.internal_onboard_400.status_code
  selection_pattern = "4\\d{2}"

  depends_on = [aws_api_gateway_integration.internal_onboard]
}

resource "aws_api_gateway_integration_response" "internal_onboard_500" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.internal_onboard.id
  http_method       = aws_api_gateway_method.internal_onboard_post.http_method
  status_code       = aws_api_gateway_method_response.internal_onboard_500.status_code
  selection_pattern = "5\\d{2}"

  depends_on = [aws_api_gateway_integration.internal_onboard]
}

# Custom Domain Name (conditional)
resource "aws_api_gateway_domain_name" "custom" {
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
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.custom.domain_name

  depends_on = [aws_api_gateway_domain_name.custom, aws_api_gateway_stage.main]
}

# Data source to reliably fetch custom domain information
data "aws_api_gateway_domain_name" "custom" {
  domain_name = var.custom_domain_name
  depends_on  = [aws_api_gateway_domain_name.custom]
}

# DNS Record for Custom Domain (conditional) - Updated to use data source
resource "aws_route53_record" "api_domain" {
  zone_id = var.hosted_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = data.aws_api_gateway_domain_name.custom.regional_domain_name
    zone_id                = data.aws_api_gateway_domain_name.custom.regional_zone_id
    evaluate_target_health = false
  }

  depends_on = [aws_api_gateway_domain_name.custom, data.aws_api_gateway_domain_name.custom]
}

# Deployment and Stage
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_rest_api.main,
    aws_api_gateway_method.any_proxy,
    aws_api_gateway_integration.any_proxy,
    aws_api_gateway_method_response.any_proxy_200,
    aws_api_gateway_method_response.any_proxy_401,
    aws_api_gateway_integration_response.any_proxy_200,
    aws_api_gateway_method.options_proxy,
    aws_api_gateway_integration.options_proxy,
    aws_api_gateway_method_response.options_proxy,
    aws_api_gateway_integration_response.options_proxy,
    aws_api_gateway_resource.proxy,
    aws_api_gateway_resource.internal,
    aws_api_gateway_resource.internal_onboard,
    aws_api_gateway_method.internal_onboard_post,
    aws_api_gateway_method_response.internal_onboard_200,
    aws_api_gateway_method_response.internal_onboard_400,
    aws_api_gateway_method_response.internal_onboard_401,
    aws_api_gateway_method_response.internal_onboard_500,
    aws_api_gateway_integration.internal_onboard,
    aws_api_gateway_integration_response.internal_onboard_200,
    aws_api_gateway_integration_response.internal_onboard_400,
    aws_api_gateway_integration_response.internal_onboard_500,
    aws_api_gateway_gateway_response.default_4xx,
    aws_api_gateway_gateway_response.default_5xx
  ]
  rest_api_id = aws_api_gateway_rest_api.main.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.main.id,
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_resource.internal.id,
      aws_api_gateway_resource.internal_onboard.id,
      aws_api_gateway_method.any_proxy.id,
      aws_api_gateway_method.internal_onboard_post.id,
      aws_api_gateway_integration.any_proxy.id,
      aws_api_gateway_integration.internal_onboard.id,
      aws_api_gateway_method_response.any_proxy_200.id,
      aws_api_gateway_method_response.any_proxy_401.id,
      aws_api_gateway_method_response.internal_onboard_200.id,
      aws_api_gateway_method_response.internal_onboard_400.id,
      aws_api_gateway_method_response.internal_onboard_401.id,
      aws_api_gateway_method_response.internal_onboard_500.id,
      aws_api_gateway_integration_response.any_proxy_200.id,
      aws_api_gateway_integration_response.internal_onboard_200.id,
      aws_api_gateway_integration_response.internal_onboard_400.id,
      aws_api_gateway_integration_response.internal_onboard_500.id,
      aws_api_gateway_gateway_response.default_4xx.id,
      aws_api_gateway_gateway_response.default_5xx.id,
      aws_api_gateway_vpc_link.main.id

    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.main.id
  rest_api_id          = aws_api_gateway_rest_api.main.id
  stage_name           = var.api_gateway_stage_name
  xray_tracing_enabled = var.apigw_enable_xray
}


#############################
# API Gateway logging (optional)
#############################

resource "aws_iam_role" "apigw_cloudwatch_role" {
  count = var.enable_apigw_logging ? 1 : 0
  name  = "${var.project_name}-${var.environment}-apigw-cw-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
    }]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Attach the managed policy AmazonAPIGatewayPushToCloudWatchLogs to ensure API Gateway has the exact required permissions
resource "aws_iam_role_policy_attachment" "apigw_cloudwatch_role_attach" {
  count      = var.enable_apigw_logging ? 1 : 0
  role       = aws_iam_role.apigw_cloudwatch_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}


# Method settings for logging and data trace
resource "aws_api_gateway_method_settings" "all_methods" {
  count       = var.enable_apigw_logging ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled    = true
    logging_level      = var.apigw_logging_level
    data_trace_enabled = var.apigw_data_trace_enabled
  }
}

