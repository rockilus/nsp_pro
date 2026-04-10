#!/bin/bash
# Permit.io Policies Deployment Script for NSP Pro
# Usage: ./deploy.sh <environment> [plan|apply|destroy]

set -e

ENVIRONMENT=$1
ACTION=${2:-plan}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment> [plan|apply|destroy]"
    echo "Environments: development, staging, production"
    exit 1
fi

if [ ! -d "$SCRIPT_DIR/environments/$ENVIRONMENT" ]; then
    echo "❌ Environment $ENVIRONMENT not found"
    echo "Available environments: development, staging, production"
    exit 1
fi

# Change to environment directory
cd "$SCRIPT_DIR/environments/$ENVIRONMENT"

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "⚠️  terraform.tfvars not found. Please copy from terraform.tfvars.example and update with your values."
    echo "   cp terraform.tfvars.example terraform.tfvars"
    echo "   # Then edit terraform.tfvars with your actual values"
    exit 1
fi

# Validate PERMIT_API_KEY environment variable
if [ -z "$PERMIT_API_KEY" ]; then
    echo "⚠️  PERMIT_API_KEY environment variable not set."
    echo "   Please set it with: export PERMIT_API_KEY=your-permit-api-key"
    exit 1
fi

echo "🚀 Running Terraform $ACTION for $ENVIRONMENT environment..."
echo "📁 Working directory: $(pwd)"

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "🔧 Initializing Terraform..."
    terraform init
fi

case $ACTION in
    plan)
        echo "📋 Planning Permit.io policies deployment..."
        terraform plan -var-file="terraform.tfvars" -var="permit_api_key=$PERMIT_API_KEY"
        ;;
    apply)
        echo "🚢 Applying Permit.io policies..."
        terraform apply -var-file="terraform.tfvars" -var="permit_api_key=$PERMIT_API_KEY" -auto-approve
        ;;
    destroy)
        echo "🗑️  Destroying Permit.io policies (USE WITH CAUTION)..."
        read -p "Are you sure you want to destroy $ENVIRONMENT policies? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            terraform destroy -var-file="terraform.tfvars" -var="permit_api_key=$PERMIT_API_KEY" -auto-approve
        else
            echo "❌ Destroy cancelled"
            exit 1
        fi
        ;;
    init)
        echo "🔧 Initializing Terraform..."
        terraform init
        ;;
    validate)
        echo "✅ Validating Terraform configuration..."
        terraform validate
        ;;
    *)
        echo "❌ Invalid action: $ACTION"
        echo "Valid actions: plan, apply, destroy, init, validate"
        exit 1
        ;;
esac

echo "✅ Terraform $ACTION completed for $ENVIRONMENT environment"
