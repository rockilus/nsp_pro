#!/bin/bash

# Landing Page Deployment Script for Rockilus (rockilus-web)
# Builds the Next.js static export and deploys it to S3 + CloudFront

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LANDING_PAGE_DIR="$PROJECT_ROOT/rockilus-web"
INFRA_DIR="$PROJECT_ROOT/infra"

# Default values
ENVIRONMENT="prod"
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

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Rockilus landing page (rockilus-web) to AWS S3 and CloudFront

OPTIONS:
    -e, --environment ENV    Environment to deploy to (prod) [default: prod]
    -r, --region REGION      AWS region [default: eu-west-3]
    -p, --profile PROFILE    AWS profile to use
    -n, --dry-run            Show what would be done without executing
    -s, --skip-build         Skip building the site (deploy existing out/ directory)
    -v, --verbose            Enable verbose output
    -h, --help               Show this help message

EXAMPLES:
    $0                                  # Deploy to prod
    $0 -p my-aws-profile               # Deploy using a specific AWS profile
    $0 -n -e prod                      # Dry run for production
    $0 -s                              # Deploy existing build without rebuilding

PREREQUISITES:
    - AWS CLI configured
    - Node.js and npm installed
    - Terraform applied for the target environment (provides S3 bucket and CloudFront IDs)

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

# Set AWS credentials
if [[ -n "$AWS_PROFILE" ]]; then
    export AWS_PROFILE="$AWS_PROFILE"
    print_info "Using AWS profile: $AWS_PROFILE"
fi
export AWS_DEFAULT_REGION="$AWS_REGION"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'prod'"
    exit 1
fi

print_info "Deploying landing page to environment: $ENVIRONMENT"
print_info "Using AWS region: $AWS_REGION"

# Check required directories exist
if [[ ! -d "$LANDING_PAGE_DIR" ]]; then
    print_error "Landing page directory not found: $LANDING_PAGE_DIR"
    exit 1
fi

if [[ ! -d "$INFRA_DIR/environments/$ENVIRONMENT" ]]; then
    print_error "Infrastructure environment directory not found: $INFRA_DIR/environments/$ENVIRONMENT"
    exit 1
fi

# Retrieve Terraform output helper
get_terraform_output() {
    local output_name="$1"
    local tf_dir="$INFRA_DIR/environments/$ENVIRONMENT"

    [[ $VERBOSE == true ]] && print_info "Getting Terraform output: $output_name"

    cd "$tf_dir"
    terraform output -raw "$output_name" 2>/dev/null || {
        print_error "Failed to get Terraform output: $output_name"
        print_error "Make sure Terraform has been applied for environment: $ENVIRONMENT"
        exit 1
    }
}

# Retrieve infrastructure info from Terraform state
print_info "Retrieving infrastructure information from Terraform..."
S3_BUCKET=$(get_terraform_output "landing_page_s3_bucket")
CLOUDFRONT_DISTRIBUTION_ID=$(get_terraform_output "landing_page_cloudfront_distribution_id")
WEBSITE_URL=$(get_terraform_output "landing_page_url")

print_info "S3 Bucket:                 $S3_BUCKET"
print_info "CloudFront Distribution:   $CLOUDFRONT_DISTRIBUTION_ID"
print_info "Website URL:               $WEBSITE_URL"

if [[ -z "$S3_BUCKET" || -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    print_error "Failed to retrieve required Terraform outputs. Has 'terraform apply' been run?"
    exit 1
fi

# Build the landing page (Next.js static export → out/)
if [[ $SKIP_BUILD == false ]]; then
    print_info "Building rockilus-web..."
    cd "$LANDING_PAGE_DIR"

    if [[ $DRY_RUN == true ]]; then
        print_info "DRY RUN: Would run 'npm run build' in $LANDING_PAGE_DIR"
    else
        if [[ ! -d "node_modules" ]]; then
            print_info "Installing dependencies..."
            npm ci
        fi

        npm run build
        print_success "Build completed — static export in $LANDING_PAGE_DIR/out/"
    fi
else
    print_info "Skipping build"
    if [[ ! -d "$LANDING_PAGE_DIR/out" ]]; then
        print_error "Build output not found at $LANDING_PAGE_DIR/out — run without --skip-build first"
        exit 1
    fi
fi

# Deploy to S3
print_info "Deploying to S3 bucket: $S3_BUCKET"
cd "$LANDING_PAGE_DIR"

if [[ $DRY_RUN == true ]]; then
    print_info "DRY RUN: Would sync $LANDING_PAGE_DIR/out/ to s3://$S3_BUCKET"
    [[ $VERBOSE == true ]] && aws s3 sync out/ "s3://$S3_BUCKET" --delete --dryrun
else
    QUIET_FLAG="--quiet"
    [[ $VERBOSE == true ]] && QUIET_FLAG=""

    # Pass 1: Content-hashed _next/static/ chunks — immutable, cache 1 year
    print_info "Uploading immutable Next.js static chunks..."
    aws s3 sync out/_next/static/ "s3://$S3_BUCKET/_next/static/" \
        --cache-control "public, max-age=31536000, immutable" \
        $QUIET_FLAG

    # Pass 2: HTML files — no-cache so browsers always fetch fresh asset references
    print_info "Uploading HTML files with no-cache headers..."
    aws s3 sync out/ "s3://$S3_BUCKET" \
        --exclude "*" --include "*.html" \
        --cache-control "no-cache, no-store, must-revalidate" \
        $QUIET_FLAG

    # Pass 3: Other assets (images, fonts, manifests, icons, etc.) — 1 hour cache
    print_info "Uploading remaining assets..."
    aws s3 sync out/ "s3://$S3_BUCKET" \
        --exclude "_next/static/*" --exclude "*.html" \
        --cache-control "public, max-age=3600" \
        $QUIET_FLAG

    # Pass 4: Remove stale files (use --size-only to avoid resetting cache headers)
    print_info "Removing stale files from S3..."
    aws s3 sync out/ "s3://$S3_BUCKET" \
        --delete --size-only \
        $QUIET_FLAG

    print_success "Files deployed to S3"
fi

# Invalidate CloudFront cache
print_info "Invalidating CloudFront cache for distribution: $CLOUDFRONT_DISTRIBUTION_ID"

if [[ $DRY_RUN == true ]]; then
    print_info "DRY RUN: Would create CloudFront invalidation for distribution: $CLOUDFRONT_DISTRIBUTION_ID"
else
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)

    print_success "CloudFront invalidation created: $INVALIDATION_ID"
    print_info "Invalidation may take 10-15 minutes to complete globally"
fi

# Final summary
print_success "Deployment completed!"
print_info "Landing page URL: $WEBSITE_URL"

if [[ $DRY_RUN == false ]]; then
    print_info "Note: CloudFront changes may take a few minutes to propagate"
fi
