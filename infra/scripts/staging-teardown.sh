#!/bin/bash

# filepath: /Users/felipekharaba/Code/nsp_pro/scripts/staging-teardown.sh

# Command to run from infra directory:
# ./scripts/staging-teardown.sh --profile rockilus-staging

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Correct paths: PROJECT_ROOT is already the `infra` directory, so don't duplicate `infra` in child paths
STAGING_DIR="$PROJECT_ROOT/environments/staging"
MODULES_DIR="$PROJECT_ROOT/modules"

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

# Function to empty S3 bucket contents (handles versioned buckets) and remove from terraform state
preserve_s3_buckets() {
    log "Preserving S3 buckets: emptying contents and removing from terraform state"
    cd "$STAGING_DIR"

    # Find all aws_s3_bucket resources in terraform state
    s3_resources=()
    while IFS= read -r line; do
        s3_resources+=("$line")
    done < <(terraform state list 2>/dev/null | grep 'aws_s3_bucket' || true)

    if [ ${#s3_resources[@]} -eq 0 ]; then
        log "No S3 bucket resources found in terraform state"
        return 0
    fi

    for res in "${s3_resources[@]}"; do
        log "Processing terraform resource: $res"

        # Extract bucket name from state
        bucket_name=$(terraform state show "$res" 2>/dev/null | awk -F'= ' '/^ *bucket *=/ {gsub(/"/,"",$2); print $2; exit}')

        if [ -z "$bucket_name" ]; then
            warn "Could not determine bucket name for $res, skipping"
            continue
        fi

        log "Emptying bucket: $bucket_name"

        # Check if versioning enabled
        versioning=$(aws s3api get-bucket-versioning --bucket "$bucket_name" --query 'Status' --output text 2>/dev/null || echo "None")

        if [ "$versioning" = "Enabled" ]; then
            log "Bucket $bucket_name is versioned — deleting all versions and delete markers"
            # Loop and delete versions/delete markers until none remain
            while true; do
                aws s3api list-object-versions --bucket "$bucket_name" --output json \
                    --query='{Objects: (Versions[] | [].{Key:Key,VersionId:VersionId}) + (DeleteMarkers[] | [].{Key:Key,VersionId:VersionId})}' \
                    > /tmp/s3_delete.json 2>/dev/null || true

                if [ ! -s /tmp/s3_delete.json ]; then
                    break
                fi

                # If jq is available, use it to count objects; otherwise fallback to a grep check
                if command -v jq >/dev/null 2>&1; then
                    count=$(jq -r '.Objects | length' /tmp/s3_delete.json 2>/dev/null || echo 0)
                    if [ "$count" -eq 0 ]; then
                        break
                    fi
                else
                    if grep -q '"Objects"[[:space:]]*:\s*\[\s*\]' /tmp/s3_delete.json 2>/dev/null; then
                        break
                    fi
                fi

                aws s3api delete-objects --bucket "$bucket_name" --delete file:///tmp/s3_delete.json >/dev/null 2>&1 || warn "Failed to delete some object versions in $bucket_name"
                rm -f /tmp/s3_delete.json
            done
            rm -f /tmp/s3_delete.json
        else
            # Non-versioned bucket: delete all objects
            log "Deleting all objects from $bucket_name"
            aws s3 rm "s3://$bucket_name" --recursive >/dev/null 2>&1 || warn "Failed to delete objects from $bucket_name"
        fi

        # After emptying, remove the bucket resource from terraform state so terraform won't try to delete it
        log "Removing $res from terraform state to avoid bucket deletion"
        terraform state rm "$res" >/dev/null 2>&1 || warn "Failed to remove $res from terraform state"
        success "Preserved bucket $bucket_name (emptied and removed from state)"
    done
}

# Main entry: run checks, confirm, then perform teardown steps
main() {
    # Parse flags: --dry-run (no destructive actions), --yes (skip confirmation),
    # --profile/-p <name>, --region/-r <name>
    DRY_RUN=0
    AUTO_YES=0
    PROFILE=""
    REGION=""

    while [ "$#" -gt 0 ]; do
        case "$1" in
            --dry-run|-n)
                DRY_RUN=1
                shift
                ;;
            --yes|-y)
                AUTO_YES=1
                shift
                ;;
            --profile|-p)
                PROFILE="$2"
                shift 2
                ;;
            --profile=*)
                PROFILE="${1#*=}"
                shift
                ;;
            --region|-r)
                REGION="$2"
                shift 2
                ;;
            --region=*)
                REGION="${1#*=}"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--dry-run] [--yes] [--profile NAME] [--region NAME]"
                echo
                echo "  --dry-run, -n       Show what would be done without making changes"
                echo "  --yes, -y           Skip interactive confirmation"
                echo "  --profile, -p NAME  AWS profile to use (sets AWS_PROFILE)"
                echo "  --region, -r NAME   AWS region to use (sets AWS_DEFAULT_REGION)"
                exit 0
                ;;
            *)
                # ignore other args
                shift
                ;;
        esac
    done

    # Export profile and region if provided
    if [ -n "$PROFILE" ]; then
        export AWS_PROFILE="$PROFILE"
        log "Using AWS profile: $AWS_PROFILE"
    fi
    if [ -n "$REGION" ]; then
        export AWS_DEFAULT_REGION="$REGION"
        log "Using AWS region: $AWS_DEFAULT_REGION"
    fi

    # Always check AWS CLI is available and configured
    check_aws_cli
    check_terraform
    init_terraform

    echo
    echo "This will destroy resources in the staging environment and delete ECR images."
    echo "If you're running this from CI or a script, be cautious — this is destructive."

    if [ "$DRY_RUN" -eq 1 ]; then
        log "Running in dry-run mode: no destructive actions will be performed."
    fi

    if [ "$AUTO_YES" -eq 0 ] && [ "$DRY_RUN" -eq 0 ]; then
        read -r -p "Type 'yes' to proceed: " CONFIRM
        if [[ ! "$CONFIRM" =~ ^([yY][eE][sS])$ ]]; then
            warn "Aborting teardown (confirmation not received)."
            exit 1
        fi
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        # Show planned actions without executing
        echo
        echo "Planned teardown actions (dry-run):"
        echo " - scale down and destroy ECS module (module.ecs)"
        echo " - destroy Network Load Balancer (module.network_load_balancer)"
        echo " - remove images from ECR repositories (main & solve)"
        echo " - destroy NAT Gateway and associated Elastic IPs (module.vpc)"
        echo " - stop DocumentDB cluster (module.documentdb)"
        echo
        echo "You can run for real with: $0 --yes"
        exit 0
    fi

    # Preserve S3 buckets (empty contents and remove from state so buckets aren't deleted)
    preserve_s3_buckets

    # Execute destructive actions
    destroy_ecs
    destroy_nlb
    clean_ecr_images
    destroy_nat_gateway
    stop_documentdb

    # Write a short restore instructions file next to the script (non-destructive)
    RESTORE_FILE="$SCRIPT_DIR/staging-restore-instructions.md"
    cat > "$RESTORE_FILE" <<'EOF'
# Staging restore instructions

The following operations are recommended to restore the staging environment after teardown:

- Re-create resources by running Terraform apply in `infra/environments/staging`.
- Push container images to ECR repositories (main and solve services).
- Verify ECS service desired counts and scaling.

EOF

    success "Staging teardown sequence completed. Restore instructions saved to: $RESTORE_FILE"
}

# If script is executed (not sourced), run main
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

