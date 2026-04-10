# Cognito Module

This Terraform module creates an AWS Cognito User Pool with email/password authentication and a post-confirmation Lambda trigger for user onboarding.

## Features

- **User Pool**: Configured for email/password authentication
- **Required Attributes**: Email, first name, last name
- **App Client**: For frontend authentication
- **Post-Confirmation Trigger**: Lambda function that calls the backend API to onboard new users
- **Security**: Advanced security mode enabled, proper password policies

## Usage

```hcl
module "cognito" {
  source = "./modules/cognito"
  
  project_name    = "nsp-pro"
  environment     = "dev"
  api_gateway_url = "https://api.rockilus.com"
  backend_api_key = var.backend_api_key
}
```

## Inputs

| Name | Description | Type | Required |
|------|-------------|------|----------|
| project_name | Name of the project | string | yes |
| environment | Environment name (dev, staging, prod) | string | yes |
| api_gateway_url | API Gateway base URL for the backend service | string | yes |
| backend_api_key | API key for backend service authentication | string | yes |

## Outputs

| Name | Description |
|------|-------------|
| user_pool_id | ID of the Cognito User Pool |
| user_pool_arn | ARN of the Cognito User Pool |
| user_pool_client_id | ID of the Cognito User Pool Client |
| user_pool_endpoint | Endpoint name of the user pool |
| user_pool_domain | Domain of the user pool |

## Post-Confirmation Lambda

The Lambda function is triggered after a user confirms their email address. It:

1. Extracts user information from the Cognito event
2. Validates required fields (user_id, email, first_name, last_name)
3. Sends a POST request to `/users/onboard` endpoint
4. Logs the result but doesn't block user confirmation on API errors

### Lambda Environment Variables

- `API_ENDPOINT_URL`: Full URL to the onboarding endpoint
- `BACKEND_API_KEY`: API key for authenticating with the backend

### API Request Format

The Lambda sends this JSON payload to the backend:

```json
{
  "user_id": "cognito-sub-id",
  "email": "user@example.com",
  "username": "user@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

## Security Features

- Advanced security mode enabled
- Strong password policy (8+ chars, uppercase, lowercase, numbers, symbols)
- User existence errors prevented
- Secure API key handling
- Proper IAM roles with least privilege

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cognito       │    │  Lambda          │    │  API Gateway    │
│   User Pool     │───▶│  Post-Confirm    │───▶│  /users/onboard │
│                 │    │  Trigger         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Notes

- The Lambda function is designed to be fault-tolerant - it won't block user confirmation if the API call fails
- All resources are tagged with environment and project name
- The module follows security best practices for healthcare applications
