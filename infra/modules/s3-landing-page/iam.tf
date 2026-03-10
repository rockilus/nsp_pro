# Data source for current AWS account identity
data "aws_caller_identity" "current" {}

# IAM role for deployment automation (CodeBuild / CodePipeline / root assume-role)
resource "aws_iam_role" "deployment" {
  name = "${var.project_name}-landing-page-deployment-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["codebuild.amazonaws.com", "codepipeline.amazonaws.com"]
        }
      },
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "${var.project_name}-landing-page-deployment-${var.environment}"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-landing-page-deployment-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Landing Page Deployment"
  })
}

# IAM policy for S3 deployment
resource "aws_iam_role_policy" "s3_deployment" {
  name = "${var.project_name}-landing-page-s3-deployment-${var.environment}"
  role = aws_iam_role.deployment.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.landing_page.arn,
          "${aws_s3_bucket.landing_page.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = aws_cloudfront_distribution.landing_page.arn
      }
    ]
  })
}

# IAM policy for CloudWatch Logs (deployment logging)
resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "${var.project_name}-landing-page-cloudwatch-logs-${var.environment}"
  role = aws_iam_role.deployment.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/codebuild/${var.project_name}-landing-page-*"
      }
    ]
  })
}

# IAM user for programmatic deployment (CI/CD scripts)
resource "aws_iam_user" "deployment_user" {
  name = "${var.project_name}-landing-page-deploy-${var.environment}"
  path = "/"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-landing-page-deploy-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Landing Page Deployment User"
  })
}

# IAM policy attachment for deployment user
resource "aws_iam_user_policy" "deployment_user_policy" {
  name = "${var.project_name}-landing-page-deploy-policy-${var.environment}"
  user = aws_iam_user.deployment_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.landing_page.arn,
          "${aws_s3_bucket.landing_page.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = aws_cloudfront_distribution.landing_page.arn
      }
    ]
  })
}

# Access key for deployment user
resource "aws_iam_access_key" "deployment_user" {
  user = aws_iam_user.deployment_user.name
}
