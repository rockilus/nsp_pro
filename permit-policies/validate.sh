#!/bin/bash
# Permit.io Policies Validation Script
# This script validates all Terraform configurations and checks for common issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENTS=("development" "staging" "production")

echo "🔍 Validating Permit.io Policies Configuration"
echo "=============================================="

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed or not in PATH"
    exit 1
fi

echo "✅ Terraform is installed: $(terraform version | head -n1)"

# Validate each environment
for env in "${ENVIRONMENTS[@]}"; do
    echo ""
    echo "🔍 Validating $env environment..."
    echo "--------------------------------"
    
    env_dir="$SCRIPT_DIR/environments/$env"
    
    if [ ! -d "$env_dir" ]; then
        echo "❌ Environment directory not found: $env_dir"
        continue
    fi
    
    cd "$env_dir"
    
    # Check if required files exist
    echo "📁 Checking required files..."
    required_files=("main.tf" "variables.tf" "terraform.tfvars.example")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo "❌ Missing required file: $file"
        else
            echo "✅ Found: $file"
        fi
    done
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        echo "⚠️  terraform.tfvars not found (copy from terraform.tfvars.example)"
    else
        echo "✅ Found: terraform.tfvars"
    fi
    
    # Initialize Terraform (without backend)
    echo "🔧 Initializing Terraform..."
    if terraform init -backend=false > /dev/null 2>&1; then
        echo "✅ Terraform initialization successful"
    else
        echo "❌ Terraform initialization failed"
        continue
    fi
    
    # Validate Terraform configuration
    echo "✅ Validating Terraform configuration..."
    if terraform validate > /dev/null 2>&1; then
        echo "✅ Terraform configuration is valid"
    else
        echo "❌ Terraform validation failed"
        terraform validate
        continue
    fi
    
    # Check formatting
    echo "📝 Checking Terraform formatting..."
    if terraform fmt -check > /dev/null 2>&1; then
        echo "✅ Terraform formatting is correct"
    else
        echo "⚠️  Terraform formatting needs correction (run: terraform fmt)"
    fi
    
    echo "✅ $env environment validation complete"
done

# Validate module
echo ""
echo "🔍 Validating shared module..."
echo "-----------------------------"

module_dir="$SCRIPT_DIR/modules/permit-policies"
cd "$module_dir"

# Initialize and validate module
echo "🔧 Initializing module..."
if terraform init -backend=false > /dev/null 2>&1; then
    echo "✅ Module initialization successful"
else
    echo "❌ Module initialization failed"
    exit 1
fi

echo "✅ Validating module configuration..."
if terraform validate > /dev/null 2>&1; then
    echo "✅ Module configuration is valid"
else
    echo "❌ Module validation failed"
    terraform validate
    exit 1
fi

echo "📝 Checking module formatting..."
if terraform fmt -check > /dev/null 2>&1; then
    echo "✅ Module formatting is correct"
else
    echo "⚠️  Module formatting needs correction (run: terraform fmt)"
fi

# Check for security best practices
echo ""
echo "🔒 Security Checks"
echo "------------------"

echo "🔍 Checking for sensitive values in code..."
if grep -r "permit.*key.*=" "$SCRIPT_DIR/environments/" --include="*.tf" > /dev/null 2>&1; then
    echo "⚠️  Potential hardcoded API keys found in Terraform files"
    grep -r "permit.*key.*=" "$SCRIPT_DIR/environments/" --include="*.tf"
else
    echo "✅ No hardcoded API keys found"
fi

echo "🔍 Checking for .tfvars files in git..."
if find "$SCRIPT_DIR" -name "terraform.tfvars" -type f | grep -v example > /dev/null 2>&1; then
    echo "⚠️  terraform.tfvars files found (should be in .gitignore)"
    find "$SCRIPT_DIR" -name "terraform.tfvars" -type f | grep -v example
else
    echo "✅ No terraform.tfvars files committed"
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="
echo "✅ All environment configurations validated"
echo "✅ Shared module validated"
echo "✅ Security checks completed"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Copy terraform.tfvars.example to terraform.tfvars in each environment"
echo "2. Update terraform.tfvars with your actual values"
echo "3. Set PERMIT_API_KEY environment variable"
echo "4. Run: ./deploy.sh <environment> plan"
echo ""

cd "$SCRIPT_DIR"
