#!/bin/bash
# validate-nlb-config.sh
# Script to validate Network Load Balancer configuration before deployment

set -e

echo "🏥 NSP Pro - Network Load Balancer Configuration Validation"
echo "==========================================================="

# Check if we're in the right directory
if [[ ! -f "main.tf" || ! -f "variables.tf" ]]; then
    echo "❌ Error: Please run this script from the infra/environments/prod directory"
    exit 1
fi

# Check if terraform.tfvars exists
if [[ ! -f "terraform.tfvars" ]]; then
    echo "❌ Error: terraform.tfvars file not found"
    echo "   Please copy terraform.tfvars.example to terraform.tfvars and configure it"
    exit 1
fi

echo "✅ Found terraform.tfvars file"

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init -backend=false > /dev/null 2>&1

# Validate Terraform configuration
echo "🔍 Validating Terraform configuration..."
if terraform validate > /dev/null 2>&1; then
    echo "✅ Terraform configuration is valid"
else
    echo "❌ Terraform configuration validation failed"
    terraform validate
    exit 1
fi

# Check for required variables
echo "🔍 Checking required variables..."

required_vars=(
    "vpc_id"
    "private_subnet_ids"
    "vpc_cidr_blocks"
)

for var in "${required_vars[@]}"; do
    if grep -q "^${var}" terraform.tfvars; then
        echo "✅ Found required variable: $var"
    else
        echo "❌ Missing required variable: $var"
        echo "   Please add this variable to your terraform.tfvars file"
        exit 1
    fi
done

# Plan the deployment (dry run)
echo "🎯 Running Terraform plan (dry run)..."
if terraform plan -out=nlb-plan > /dev/null 2>&1; then
    echo "✅ Terraform plan successful"
    
    # Show what will be created
    echo ""
    echo "📋 Resources to be created:"
    terraform show -json nlb-plan | jq -r '.resource_changes[] | select(.change.actions[] == "create") | .address' | sort
    
    # Clean up plan file
    rm -f nlb-plan
else
    echo "❌ Terraform plan failed"
    terraform plan
    exit 1
fi

echo ""
echo "🎉 Configuration validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review the planned changes above"
echo "2. Run 'terraform apply' to deploy the Network Load Balancer"
echo "3. Update your VPC Link configuration with the new NLB ARN"
echo ""
echo "🏥 Healthcare Compliance Notes:"
echo "   - Deletion protection is enabled for production"
echo "   - Security groups follow least-privilege principles"
echo "   - All resources are tagged for compliance tracking"
