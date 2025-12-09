terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.25"
    }
    awscc = {
      source  = "hashicorp/awscc"
      version = "~> 1.66"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# US-East-1 provider for CloudFront certificates
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile
}

# AWS Cloud Control provider (for awscc resources used by modules)
provider "awscc" {
  region  = var.aws_region
  profile = var.aws_profile
}

# US-East-1 alias for awscc (CloudFront / resources that require us-east-1)
provider "awscc" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile
}
