#!/bin/bash

# Frontend Infrastructure Validation Script
# Checks if the infrastructure is properly configured for frontend deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra"

# Default values
ENVIRONMENT="local"
AWS_REGION="eu-west-3"
AWS_PROFILE=""

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Validate NSP Pro frontend infrastructure setup

OPTIONS:
    -e, --environment ENV    Environment to validate (local, prod) [default: local]
    -r, --region REGION     AWS region [default: eu-west-3]
    -p, --profile PROFILE   AWS profile to use
    -h, --help             Show this help message

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
fi

export AWS_DEFAULT_REGION="$AWS_REGION"

print_info "Validating frontend infrastructure for environment: $ENVIRONMENT"
print_info "Using AWS region: $AWS_REGION"

# Validation functions
validate_terraform() {
    print_info "Checking Terraform configuration..."
    
    local tf_dir="$INFRA_DIR/environments/$ENVIRONMENT"
    
    if [[ ! -d "$tf_dir" ]]; then
        print_error "Terraform environment directory not found: $tf_dir"
        return 1
    fi
    
    if [[ ! -f "$tf_dir/main.tf" ]]; then
        print_error "Terraform main.tf not found in: $tf_dir"
        return 1
    fi
    
    # Check if frontend module is configured
    if grep -q "module \"frontend\"" "$tf_dir/main.tf"; then
        print_success "Frontend module found in Terraform configuration"
    else
        print_error "Frontend module not found in Terraform configuration"
        return 1
    fi
    
    return 0
}

validate_terraform_state() {
    print_info "Checking Terraform state..."
    
    local tf_dir="$INFRA_DIR/environments/$ENVIRONMENT"
    cd "$tf_dir"
    
    if [[ ! -f "terraform.tfstate" ]]; then
        print_warning "No Terraform state found. Run 'terraform apply' first."
        return 1
    fi
    
    # Check if Terraform outputs are available
    if terraform output frontend_s3_bucket &>/dev/null; then
        print_success "Terraform state contains frontend resources"
        return 0
    else
        print_error "Frontend resources not found in Terraform state"
        print_info "Run 'terraform apply' to create the infrastructure"
        return 1
    fi
}

validate_aws_credentials() {
    print_info "Checking AWS credentials..."
    
    if aws sts get-caller-identity &>/dev/null; then
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        local user_arn=$(aws sts get-caller-identity --query Arn --output text)
        print_success "AWS credentials valid"
        print_info "Account ID: $account_id"
        print_info "User/Role: $user_arn"
        return 0
    else
        print_error "AWS credentials not configured or invalid"
        print_info "Configure AWS CLI with 'aws configure' or set environment variables"
        return 1
    fi
}

validate_aws_resources() {
    print_info "Checking AWS resources..."
    
    local tf_dir="$INFRA_DIR/environments/$ENVIRONMENT"
    cd "$tf_dir"
    
    # Get resource information from Terraform
    local s3_bucket
    local cloudfront_id
    
    if ! s3_bucket=$(terraform output -raw frontend_s3_bucket 2>/dev/null); then
        print_error "Cannot get S3 bucket name from Terraform output"
        return 1
    fi
    
    if ! cloudfront_id=$(terraform output -raw frontend_cloudfront_distribution_id 2>/dev/null); then
        print_error "Cannot get CloudFront distribution ID from Terraform output"
        return 1
    fi
    
    # Check S3 bucket
    if aws s3api head-bucket --bucket "$s3_bucket" &>/dev/null; then
        print_success "S3 bucket exists: $s3_bucket"
    else
        print_error "S3 bucket not accessible: $s3_bucket"
        return 1
    fi
    
    # Check CloudFront distribution
    if aws cloudfront get-distribution --id "$cloudfront_id" &>/dev/null; then
        print_success "CloudFront distribution exists: $cloudfront_id"
    else
        print_error "CloudFront distribution not accessible: $cloudfront_id"
        return 1
    fi
    
    return 0
}

validate_frontend_build() {
    print_info "Checking frontend build configuration..."
    
    local frontend_dir="$PROJECT_ROOT/frontend"
    
    if [[ ! -d "$frontend_dir" ]]; then
        print_error "Frontend directory not found: $frontend_dir"
        return 1
    fi
    
    if [[ ! -f "$frontend_dir/package.json" ]]; then
        print_error "package.json not found in frontend directory"
        return 1
    fi
    
    if [[ ! -f "$frontend_dir/next.config.mjs" ]]; then
        print_error "next.config.mjs not found in frontend directory"
        return 1
    fi
    
    # Check if build:static script exists
    if grep -q "build:static" "$frontend_dir/package.json"; then
        print_success "build:static script found in package.json"
    else
        print_warning "build:static script not found in package.json"
        print_info "Add: \"build:static\": \"next build\" to package.json scripts"
    fi
    
    # Check Next.js config for static export
    if grep -q "output.*export" "$frontend_dir/next.config.mjs"; then
        print_success "Next.js configured for static export"
    else
        print_warning "Next.js may not be configured for static export"
        print_info "Ensure next.config.mjs has: output: 'export'"
    fi
    
    return 0
}

validate_deployment_script() {
    print_info "Checking deployment script..."
    
    local deploy_script="$SCRIPT_DIR/deploy-frontend.sh"
    
    if [[ ! -f "$deploy_script" ]]; then
        print_error "Deployment script not found: $deploy_script"
        return 1
    fi
    
    if [[ ! -x "$deploy_script" ]]; then
        print_warning "Deployment script is not executable"
        print_info "Run: chmod +x $deploy_script"
        return 1
    fi
    
    print_success "Deployment script found and executable"
    return 0
}

# Main validation
main() {
    local validation_passed=true
    
    echo "============================================"
    echo "NSP Pro Frontend Infrastructure Validation"
    echo "============================================"
    echo
    
    if ! validate_terraform; then
        validation_passed=false
    fi
    echo
    
    if ! validate_aws_credentials; then
        validation_passed=false
    fi
    echo
    
    if ! validate_terraform_state; then
        validation_passed=false
    fi
    echo
    
    if ! validate_aws_resources; then
        validation_passed=false
    fi
    echo
    
    if ! validate_frontend_build; then
        validation_passed=false
    fi
    echo
    
    if ! validate_deployment_script; then
        validation_passed=false
    fi
    echo
    
    echo "============================================"
    if [[ "$validation_passed" == true ]]; then
        print_success "All validations passed! Ready for deployment."
        echo
        print_info "To deploy the frontend, run:"
        print_info "  ./infra/scripts/deploy-frontend.sh -e $ENVIRONMENT"
    else
        print_error "Some validations failed. Please fix the issues above."
        exit 1
    fi
    echo "============================================"
}

# Run main function
main
