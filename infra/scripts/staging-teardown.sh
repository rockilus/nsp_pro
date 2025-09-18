#!/bin/bash

# filepath: /Users/felipekharaba/Code/nsp_pro/scripts/staging-teardown.sh

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGING_DIR="$PROJECT_ROOT/infra/environments/staging"
MODULES_DIR="$PROJECT_ROOT/infra/modules"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS CLI is not configured or credentials are invalid."
        exit 1
    fi
    
    success "AWS CLI is properly configured"
}

# Function to check if terraform is available
check_terraform() {
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install it first."
        exit 1
    fi
    success "Terraform is available"
}

# Function to initialize terraform if needed
init_terraform() {
    log "Initializing Terraform in staging directory..."
    cd "$STAGING_DIR"
    
    if [ ! -d ".terraform" ]; then
        terraform init
    else
        log "Terraform already initialized"
    fi
}

# Function to get terraform outputs
get_tf_output() {
    cd "$STAGING_DIR"
    terraform output -json 2>/dev/null || echo "{}"
}

# Function to check if resource exists before destroying
resource_exists() {
    local resource_name="$1"
    cd "$STAGING_DIR"
    terraform state list | grep -q "$resource_name" 2>/dev/null
}

# Function to destroy specific ECS services
destroy_ecs() {
    log "Destroying ECS services and cluster..."
    cd "$STAGING_DIR"
    
    # First, scale down services to 0
    log "Scaling down ECS services..."
    if resource_exists "module.ecs"; then
        # Use terraform to scale down services first
        terraform apply -target=module.ecs -var="main_service_desired_count=0" -var="solve_service_desired_count=0" -var="permit_pdp_desired_count=0" -auto-approve || warn "Failed to scale down services"
        
        # Wait a bit for services to scale down
        sleep 30
        
        # Now destroy the ECS module
        log "Destroying ECS module..."
        terraform destroy -target=module.ecs -auto-approve
        success "ECS services and cluster destroyed"
    else
        warn "ECS module not found in state"
    fi
}

# Function to destroy Network Load Balancer
destroy_nlb() {
    log "Destroying Network Load Balancer..."
    cd "$STAGING_DIR"
    
    if resource_exists "module.network_load_balancer"; then
        terraform destroy -target=module.network_load_balancer -auto-approve
        success "Network Load Balancer destroyed"
    else
        warn "Network Load Balancer module not found in state"
    fi
}

# Function to clean ECR images
clean_ecr_images() {
    log "Cleaning ECR repository images..."
    
    # Get ECR repository names from terraform output
    local outputs
    outputs=$(get_tf_output)
    
    # Extract repository names (adjust based on your actual output structure)
    local main_repo_name
    local solve_repo_name
    
    main_repo_name=$(echo "$outputs" | jq -r '.main_service_repository_name.value // empty' 2>/dev/null || echo "")
    solve_repo_name=$(echo "$outputs" | jq -r '.solve_service_repository_name.value // empty' 2>/dev/null || echo "")
    
    # If we can't get from outputs, try to derive from naming convention
    if [ -z "$main_repo_name" ] || [ -z "$solve_repo_name" ]; then
        warn "Could not get repository names from terraform outputs, using naming convention..."
        main_repo_name="nsp-pro-staging-main-service"
        solve_repo_name="nsp-pro-staging-solve-service"
    fi
    
    # Clean main service repository
    if [ -n "$main_repo_name" ]; then
        log "Cleaning images from repository: $main_repo_name"
        aws ecr list-images --repository-name "$main_repo_name" --query 'imageIds[*]' --output json > /tmp/images.json 2>/dev/null || true
        
        if [ -s /tmp/images.json ] && [ "$(cat /tmp/images.json)" != "[]" ]; then
            aws ecr batch-delete-image --repository-name "$main_repo_name" --image-ids file:///tmp/images.json >/dev/null 2>&1 || warn "Failed to delete images from $main_repo_name"
            success "Cleaned images from $main_repo_name"
        else
            log "No images found in $main_repo_name"
        fi
    fi
    
    # Clean solve service repository
    if [ -n "$solve_repo_name" ]; then
        log "Cleaning images from repository: $solve_repo_name"
        aws ecr list-images --repository-name "$solve_repo_name" --query 'imageIds[*]' --output json > /tmp/images.json 2>/dev/null || true
        
        if [ -s /tmp/images.json ] && [ "$(cat /tmp/images.json)" != "[]" ]; then
            aws ecr batch-delete-image --repository-name "$solve_repo_name" --image-ids file:///tmp/images.json >/dev/null 2>&1 || warn "Failed to delete images from $solve_repo_name"
            success "Cleaned images from $solve_repo_name"
        else
            log "No images found in $solve_repo_name"
        fi
    fi
    
    # Clean up temp file
    rm -f /tmp/images.json
}

# Function to destroy NAT Gateway and Elastic IPs
destroy_nat_gateway() {
    log "Destroying NAT Gateway and Elastic IPs..."
    cd "$STAGING_DIR"
    
    # We need to target specific resources within the VPC module
    if resource_exists "module.vpc"; then
        # First, try to destroy NAT gateway specifically
        terraform destroy -target='module.vpc.aws_nat_gateway.main[0]' -auto-approve 2>/dev/null || warn "NAT Gateway not found or already destroyed"
        
        # Then destroy the Elastic IP
        terraform destroy -target='module.vpc.aws_eip.nat[0]' -auto-approve 2>/dev/null || warn "Elastic IP not found or already destroyed"
        
        success "NAT Gateway and Elastic IP destroyed"
    else
        warn "VPC module not found in state"
    fi
}

# Function to stop DocumentDB cluster
stop_documentdb() {
    log "Stopping DocumentDB cluster..."
    
    # Get cluster identifier from terraform output or state
    cd "$STAGING_DIR"
    local cluster_id
    
    # Try to get cluster identifier from terraform state
    cluster_id=$(terraform state show 'module.documentdb.aws_docdb_cluster.main' 2>/dev/null | grep "cluster_identifier" | awk '{print $3}' | tr -d '"' || echo "")
    
    # If not found, use naming convention
    if [ -z "$cluster_id" ]; then
        cluster_id="nsp-pro-staging-docdb"
        warn "Could not get cluster ID from state, using naming convention: $cluster_id"
    fi
    
    # Check if cluster exists and is running
    local cluster_status
    cluster_status=$(aws docdb describe-db-clusters --db-cluster-identifier "$cluster_id" --query 'DBClusters[0].Status' --output text 2>/dev/null || echo "not-found")
    
    if [ "$cluster_status" == "available" ]; then
        log "Stopping DocumentDB cluster: $cluster_id"
        aws docdb stop-db-cluster --db-cluster-identifier "$cluster_id" >/dev/null 2>&1 || warn "Failed to stop DocumentDB cluster"
        success "DocumentDB cluster stop initiated"
    elif [ "$cluster_status" == "stopped" ]; then
        log "DocumentDB cluster is already stopped"
    elif [ "$cluster_status" == "stopping" ]; then
        log "DocumentDB cluster is already stopping"
    else
        warn "DocumentDB cluster not found or in unexpected state: $cluster_status"
    fi
}

# Function to display cost savings summary
show_cost_summary() {
    log "Cost Savings Summary:"
    echo "======================================"
    echo "✅ ECS Services: ~\$50-200/month saved"
    echo "✅ Network Load Balancer: ~\$16/month saved"
    echo "✅ NAT Gateway: ~\$45/month saved"
    echo "✅ DocumentDB (stopped): ~\$100-500/month saved"
    echo "✅ ECR storage (cleaned): ~\$1-10/month saved"
    echo ""
    echo "🔄 Resources kept for quick restart:"
    echo "   - VPC (except NAT)"
    echo "   - ECR repositories"
    echo "   - Cognito"
    echo "   - IAM roles"
    echo "   - SQS queues"
    echo "   - Route 53"
    echo "   - API Gateway"
    echo "   - Frontend S3/CloudFront"
    echo "   - Security Groups"
    echo ""
    echo "💡 To restart staging environment:"
    echo "   ./scripts/staging-startup.sh"
}

# Function to create restore instructions
create_restore_instructions() {
    local restore_file="$SCRIPT_DIR/staging-restore-instructions.md"
    
    cat > "$restore_file" << 'EOF'
# Staging Environment Restore Instructions

This file contains instructions to restore the staging environment after teardown.

## Quick Restore Commands

1. **Start DocumentDB cluster** (if stopped):
   ```bash
   aws docdb start-db-cluster --db-cluster-identifier nsp-pro-staging-docdb
   ```

2. **Recreate NAT Gateway and Elastic IP**:
   ```bash
   cd infra/environments/staging
   terraform apply -target='module.vpc.aws_eip.nat[0]' -auto-approve
   terraform apply -target='module.vpc.aws_nat_gateway.main[0]' -auto-approve
   ```

3. **Recreate Network Load Balancer**:
   ```bash
   terraform apply -target=module.network_load_balancer -auto-approve
   ```

4. **Recreate ECS services**:
   ```bash
   # First ensure images are available in ECR
   # Then apply ECS module
   terraform apply -target=module.ecs -auto-approve
   ```

## Full Environment Restore

To restore the complete staging environment:

```bash
cd infra/environments/staging
terraform apply
```

## Notes

- DocumentDB will take 5-10 minutes to start
- NAT Gateway recreation will briefly interrupt private subnet internet access
- ECS services will need fresh container images in ECR
- DNS and SSL certificates remain active throughout teardown
</EOF>

    success "Restore instructions created at: $restore_file"
}

# Main execution function
main() {
    log "Starting NSP Pro Staging Environment Teardown"
    log "============================================="
    
    # Pre-flight checks
    check_aws_cli
    check_terraform
    
    # Confirm with user
    warn "This will destroy/deactivate staging environment components to save costs."
    warn "The following will be destroyed: ECS, NLB, NAT Gateway, ECR images"
    warn "The following will be stopped: DocumentDB"
    warn "The following will be kept: VPC, ECR repos, Cognito, IAM, SQS, Route53, API Gateway, Frontend, Security Groups"
    echo
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Teardown cancelled by user"
        exit 0
    fi
    
    # Initialize terraform
    init_terraform
    
    # Execute teardown in order
    log "Starting teardown sequence..."
    
    # 1. ECS (includes services and cluster)
    destroy_ecs
    
    # 2. Network Load Balancer
    destroy_nlb
    
    # 3. ECR images cleanup
    clean_ecr_images
    
    # 4. NAT Gateway and Elastic IPs
    destroy_nat_gateway
    
    # 5. DocumentDB stop
    stop_documentdb
    
    # Create restore instructions
    create_restore_instructions
    
    # Show summary
    success "Staging environment teardown completed successfully!"
    show_cost_summary
    
    log "Teardown process finished at $(date)"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi