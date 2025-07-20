# IAM Role for the Lambda
resource "aws_iam_role" "cognito_trigger_lambda_role" {
  name = "${var.project_name}-cognito-post-confirmation-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- CloudWatch Logs Policy ---
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.cognito_trigger_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SSM parameter access policy for Lambda
resource "aws_iam_role_policy" "ssm_access" {
  name = "${var.project_name}-cognito-lambda-ssm-${var.environment}"
  role = aws_iam_role.cognito_trigger_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/${var.environment}/internal-api-key"
      }
    ]
  })
}

# Archive the Lambda code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_function.py"
  output_path = "${path.module}/cognito_trigger.zip"
}

# The Lambda Function Resource
resource "aws_lambda_function" "post_confirmation_trigger" {
  function_name = "${var.project_name}-cognito-post-confirmation-${var.environment}"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  role          = aws_iam_role.cognito_trigger_lambda_role.arn

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      ENVIRONMENT  = var.environment
      REGION       = var.aws_region
      API_BASE_URL = var.api_gateway_url
    }
  }

  timeout     = 15
  memory_size = 128

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }

  # Ensure Lambda is created after IAM policies
  depends_on = [
    aws_iam_role_policy.ssm_access,
    aws_iam_role_policy_attachment.lambda_logs
  ]
}

# Lambda permission for Cognito to invoke the function
resource "aws_lambda_permission" "allow_cognito" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation_trigger.function_name
  principal     = "cognito-idp.amazonaws.com"
}
