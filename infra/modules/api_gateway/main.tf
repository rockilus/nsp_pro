# Create the API Gateway

# REST API Gateway configuration for proxy+ with Cognito authorizer, VPC link, and CORS

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
  provider_arns          = ["arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/${var.cognito_user_pool_id}"]
  identity_source        = "method.request.header.Authorization"
}

# VPC Link
resource "aws_api_gateway_vpc_link" "main" {
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

# Integration for ANY method
resource "aws_api_gateway_integration" "any_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.any_proxy.http_method
  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = var.vpc_link_endpoint_url
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.main.id
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.path.proxy"               = "method.request.path.proxy"
    "integration.request.header.X-Forwarded-For"   = "method.request.header.X-Forwarded-For"
    "integration.request.header.X-Forwarded-Host"  = "context.domainName"
    "integration.request.header.X-Forwarded-Proto" = "method.request.header.X-Forwarded-Proto"
  }
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
data "aws_caller_identity" "current" {}
