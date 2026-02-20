#!/bin/bash

# Frontend Deployment Script for NSP Pro
# This script builds and deploys the Next.js frontend to S3 and invalidates CloudFront

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
INFRA_DIR="$PROJECT_ROOT/infra"

# Default values
ENVIRONMENT="local"
AWS_REGION="eu-west-3"
AWS_PROFILE=""
DRY_RUN=false
SKIP_BUILD=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy NSP Pro frontend to AWS S3 and CloudFront

OPTIONS:
    -e, --environment ENV    Environment to deploy to (local, prod) [default: local]
    -r, --region REGION     AWS region [default: eu-west-3]
    -p, --profile PROFILE   AWS profile to use
    -n, --dry-run          Show what would be done without executing
    -s, --skip-build       Skip building the frontend (deploy existing build)
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message

EXAMPLES:
    $0                                  # Deploy to local environment
    $0 -e prod -r us-east-1            # Deploy to production
    $0 -n -e prod                      # Dry run for production
    $0 -s -e local                     # Deploy existing build to local

PREREQUISITES:
    - AWS CLI configured
    - Node.js and npm installed
    - Terraform applied for the target environment
    - Frontend built (unless using --skip-build)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set AWS profile if provided
if [[ -n "$AWS_PROFILE" ]]; then
    export AWS_PROFILE="$AWS_PROFILE"
    print_info "Using AWS profile: $AWS_PROFILE"
fi

# Set AWS region
export AWS_DEFAULT_REGION="$AWS_REGION"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(local|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'local' or 'prod'"
    exit 1
fi

print_info "Deploying frontend to environment: $ENVIRONMENT"
print_info "Using AWS region: $AWS_REGION"

# Check if required directories exist
if [[ ! -d "$FRONTEND_DIR" ]]; then
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

if [[ ! -d "$INFRA_DIR/environments/$ENVIRONMENT" ]]; then
    print_error "Infrastructure environment directory not found: $INFRA_DIR/environments/$ENVIRONMENT"
    exit 1
fi

# Function to get Terraform output
get_terraform_output() {
    local output_name="$1"
    local tf_dir="$INFRA_DIR/environments/$ENVIRONMENT"
    
    if [[ $VERBOSE == true ]]; then
        print_info "Getting Terraform output: $output_name from $tf_dir"
    fi
    
    cd "$tf_dir"
    terraform output -raw "$output_name" 2>/dev/null || {
        print_error "Failed to get Terraform output: $output_name"
        print_error "Make sure Terraform has been applied for environment: $ENVIRONMENT"
        exit 1
    }
}

# Get infrastructure information from Terraform
print_info "Retrieving infrastructure information from Terraform..."
S3_BUCKET=$(get_terraform_output "frontend_s3_bucket")
CLOUDFRONT_DISTRIBUTION_ID=$(get_terraform_output "frontend_cloudfront_distribution_id")
WEBSITE_URL=$(get_terraform_output "frontend_url")

# Get Route 53 information if available (for production environments with custom domains)
ROUTE53_DOMAIN=$(get_terraform_output "route53_domain_name" 2>/dev/null || echo "")
SSL_CERTIFICATE_ARN=$(get_terraform_output "ssl_certificate_arn" 2>/dev/null || echo "")
SSL_CERTIFICATE_STATUS=$(get_terraform_output "ssl_certificate_status" 2>/dev/null || echo "")

print_info "S3 Bucket: $S3_BUCKET"
print_info "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
print_info "Website URL: $WEBSITE_URL"

# Show Route 53 information if available
if [[ -n "$ROUTE53_DOMAIN" ]]; then
    print_info "Custom Domain: $ROUTE53_DOMAIN"
    if [[ -n "$SSL_CERTIFICATE_ARN" ]]; then
        print_info "SSL Certificate: ${SSL_CERTIFICATE_ARN##*/}"
        print_info "Certificate Status: $SSL_CERTIFICATE_STATUS"
    fi
fi

# Validate that we got the required information
if [[ -z "$S3_BUCKET" || -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    print_error "Failed to retrieve required infrastructure information"
    exit 1
fi

# Build the frontend if not skipping
if [[ $SKIP_BUILD == false ]]; then
    print_info "Building frontend..."
    cd "$FRONTEND_DIR"
    
    if [[ $DRY_RUN == true ]]; then
        print_info "DRY RUN: Would run 'npm run build:static' in $FRONTEND_DIR"
    else
        # Check if node_modules exists
        if [[ ! -d "node_modules" ]]; then
            print_info "Installing dependencies..."
            npm ci
        fi
        
        # Build the application
        npm run build:static
        print_success "Frontend build completed"
    fi
else
    print_info "Skipping frontend build"
    
    # Check if build output exists
    if [[ ! -d "$FRONTEND_DIR/out" ]]; then
        print_error "Build output directory not found: $FRONTEND_DIR/out"
        print_error "Run the build first or remove the --skip-build flag"
        exit 1
    fi
fi

# Deploy to S3
print_info "Deploying to S3 bucket: $S3_BUCKET"
cd "$FRONTEND_DIR"

if [[ $DRY_RUN == true ]]; then
    print_info "DRY RUN: Would sync $FRONTEND_DIR/out/ to s3://$S3_BUCKET"
    if [[ $VERBOSE == true ]]; then
        aws s3 sync out/ "s3://$S3_BUCKET" --delete --dryrun
    fi
else
    QUIET_FLAG="--quiet"
    [[ $VERBOSE == true ]] && QUIET_FLAG=""

    # Pass 1: Content-hashed _next/static/ assets — safe to cache for 1 year.
    # These files have a unique hash in their name so they never collide across deploys.
    print_info "Uploading immutable static chunks..."
    aws s3 sync out/_next/static/ "s3://$S3_BUCKET/_next/static/" \
        --cache-control "public, max-age=31536000, immutable" \
        $QUIET_FLAG

    # Pass 2: HTML files — must never be cached so browsers always get fresh
    # asset references after a redeploy. This is the root fix for the
    # "SyntaxError: Unexpected token '<'" chunk-loading bug on Safari.
    print_info "Uploading HTML files with no-cache headers..."
    aws s3 sync out/ "s3://$S3_BUCKET" \
        --exclude "*" --include "*.html" \
        --cache-control "no-cache, no-store, must-revalidate" \
        $QUIET_FLAG

    # Pass 3: Everything else (fonts, images, manifests, icons, etc.)
    print_info "Uploading remaining assets..."
    aws s3 sync out/ "s3://$S3_BUCKET" \
        --exclude "_next/static/*" --exclude "*.html" \
        --cache-control "public, max-age=3600" \
        $QUIET_FLAG

    # Pass 4: Remove files from S3 that are no longer in the build.
    # Use --size-only so already-uploaded files are not re-sent (avoids resetting
    # cache headers set in the passes above).
    print_info "Removing stale files from S3..."
    aws s3 sync out/ "s3://$S3_BUCKET" \
        --delete --size-only \
        $QUIET_FLAG

    print_success "Files deployed to S3"
fi

# Invalidate CloudFront cache
print_info "Invalidating CloudFront cache..."

if [[ $DRY_RUN == true ]]; then
    print_info "DRY RUN: Would create CloudFront invalidation for distribution: $CLOUDFRONT_DISTRIBUTION_ID"
else
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    print_success "CloudFront invalidation created: $INVALIDATION_ID"
    print_info "Invalidation may take 10-15 minutes to complete"
fi

# Final summary
print_success "Deployment completed!"
print_info "Website URL: $WEBSITE_URL"

if [[ $DRY_RUN == false ]]; then
    print_info "Note: CloudFront changes may take a few minutes to propagate globally"
fi
