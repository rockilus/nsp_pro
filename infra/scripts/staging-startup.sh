#!/bin/bash

# filepath: /Users/felipekharaba/Code/nsp_pro/scripts/staging-startup.sh

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGING_DIR="$PROJECT_ROOT/infra/environments/staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to start DocumentDB cluster
start_documentdb() {
    log "Starting DocumentDB cluster..."
    local cluster_id="nsp-pro-staging-docdb"
    
    local cluster_status
    cluster_status=$(aws docdb describe-db-clusters --db-cluster-identifier "$cluster_id" --query 'DBClusters[0].Status' --output text 2>/dev/null || echo "not-found")
    
    if [ "$cluster_status" == "stopped" ]; then
        log "Starting DocumentDB cluster: $cluster_id"
        aws docdb start-db-cluster --db-cluster-identifier "$cluster_id"
        success "DocumentDB cluster start initiated (will take 5-10 minutes)"
    elif [ "$cluster_status" == "available" ]; then
        log "DocumentDB cluster is already running"
    else
        warn "DocumentDB cluster status: $cluster_status"
    fi
}

# Function to restore infrastructure components
restore_infrastructure() {
    log "Restoring staging infrastructure..."
    cd "$STAGING_DIR"
    
    # Apply in the correct order
    log "1. Restoring NAT Gateway and Elastic IP..."
    terraform apply -target='module.vpc.aws_eip.nat[0]' -auto-approve
    terraform apply -target='module.vpc.aws_nat_gateway.main[0]' -auto-approve
    
    log "2. Restoring Network Load Balancer..."
    terraform apply -target=module.network_load_balancer -auto-approve
    
    log "3. Restoring ECS services..."
    terraform apply -target=module.ecs -auto-approve
    
    success "Infrastructure restoration completed"
}

main() {
    log "Starting NSP Pro Staging Environment Startup"
    log "============================================"
    
    warn "This will restore the staging environment infrastructure."
    read -p "Continue? (yes/no): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Startup cancelled"
        exit 0
    fi
    
    start_documentdb
    restore_infrastructure
    
    success "Staging environment startup completed!"
    log "Environment should be fully operational in 5-10 minutes"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi