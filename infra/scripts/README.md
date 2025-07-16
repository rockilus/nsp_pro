# Infrastructure Scripts

This directory contains automation scripts for managing the NSP Pro infrastructure.

## Scripts

### `deploy-frontend.sh`

Automated deployment script for the Next.js frontend to AWS S3 and CloudFront.

**Features:**
- Builds Next.js static export
- Deploys to S3 bucket
- Invalidates CloudFront cache
- Supports multiple environments
- Dry-run capability
- Verbose logging

**Usage:**
```bash
# Deploy to local environment
./deploy-frontend.sh

# Deploy to production
./deploy-frontend.sh -e prod

# Dry run for production
./deploy-frontend.sh -n -e prod

# Deploy with custom AWS profile
./deploy-frontend.sh -e prod -p my-profile

# Skip build step (deploy existing build)
./deploy-frontend.sh -s -e local
```

**Options:**
- `-e, --environment`: Target environment (local, prod)
- `-r, --region`: AWS region
- `-p, --profile`: AWS profile to use
- `-n, --dry-run`: Show what would be done without executing
- `-s, --skip-build`: Skip frontend build step
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Show help message

### `validate-frontend.sh`

Validation script to check if the infrastructure is properly configured for frontend deployment.

**Checks:**
- Terraform configuration
- Terraform state
- AWS credentials
- AWS resources (S3, CloudFront)
- Frontend build configuration
- Deployment script

**Usage:**
```bash
# Validate local environment
./validate-frontend.sh

# Validate production environment
./validate-frontend.sh -e prod

# Validate with custom AWS profile
./validate-frontend.sh -e prod -p my-profile
```

**Options:**
- `-e, --environment`: Target environment (local, prod)
- `-r, --region`: AWS region
- `-p, --profile`: AWS profile to use
- `-h, --help`: Show help message

## Prerequisites

### For All Scripts
- AWS CLI installed and configured
- Terraform applied for target environment
- Proper AWS permissions

### For Deployment Script
- Node.js and npm installed
- Frontend dependencies installed (`npm ci`)

## Quick Start

1. **Validate setup:**
   ```bash
   ./infra/scripts/validate-frontend.sh -e local
   ```

2. **Deploy frontend:**
   ```bash
   ./infra/scripts/deploy-frontend.sh -e local
   ```

## Environment Configuration

### Local Environment
- Uses development settings
- CloudFront default domain
- Terraform state: `infra/environments/local/`

### Production Environment
- Production optimizations
- Optional custom domain support
- Terraform state: `infra/environments/prod/`

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x infra/scripts/*.sh
   ```

2. **AWS Credentials**
   ```bash
   aws configure
   # or
   export AWS_PROFILE=your-profile
   ```

3. **Terraform Not Applied**
   ```bash
   cd infra/environments/local
   terraform apply
   ```

4. **Frontend Build Issues**
   ```bash
   cd frontend
   npm ci
   npm run build:static
   ```

### Getting Help

Run any script with `-h` or `--help` for detailed usage information:

```bash
./infra/scripts/deploy-frontend.sh --help
./infra/scripts/validate-frontend.sh --help
```

## Script Development

### Adding New Scripts

1. Create executable script in this directory
2. Follow the existing naming convention
3. Include help text and error handling
4. Add entry to this README

### Testing Scripts

Always test scripts with dry-run mode first:

```bash
./deploy-frontend.sh -n -e prod
```

### Script Standards

- Use `set -e` for error handling
- Provide colored output for better UX
- Include verbose mode for debugging
- Support dry-run mode where applicable
- Add comprehensive help text

## Integration

These scripts are designed to work with:
- **CI/CD Pipelines**: GitHub Actions, GitLab CI, etc.
- **Local Development**: Manual deployment and testing
- **Infrastructure Management**: Terraform-based deployment

### CI/CD Example

```yaml
# GitHub Actions
- name: Validate Infrastructure
  run: ./infra/scripts/validate-frontend.sh -e prod

- name: Deploy Frontend
  run: ./infra/scripts/deploy-frontend.sh -e prod
```
