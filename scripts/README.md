# Development Scripts

This directory contains scripts for local development setup and testing.

## Files

- `init-dev-user.sh`: Shell script that calls the `/users/onboard` endpoint to create a test user
- `Dockerfile.init-user`: Docker container definition for running the init script
- `init-localstack-sqs.sh`: Shell script to initialize SQS queues in LocalStack for local development

## Usage

### Option 1: Regular development startup
```bash
docker-compose up
```

### Option 2: With user initialization
```bash
docker-compose --profile dev-init up
```

### Option 3: Run initialization separately
```bash
# Start main services first
docker-compose up -d

# Run initialization
docker-compose run --rm init-dev-user
```

## Test User Details

The script creates a test user with the following details:
- **User ID**: `64e9b7f1e13e4a1a9c8b4567`
- **Email**: `testuser@example.com`
- **Username**: `testuser`
- **First Name**: `Test`
- **Last Name**: `User`

## How It Works

1. The script waits for FastAPI and Permit.io services to be healthy
2. Makes a POST request to `/users/onboard` endpoint with service authentication
3. The endpoint uses `UserService.create_user()` which:
   - Creates the user in MongoDB
   - Sets up permissions in Permit.io
   - Returns success (idempotent - safe to run multiple times)

## LocalStack SQS Initialization

### init-localstack-sqs.sh

Initializes SQS queues in LocalStack for local development and testing.

**Created Queues:**
- `nsp-pro-dev-solve-queue` - Main queue for solver requests
- `nsp-pro-dev-solve-dlq` - Dead-letter queue for failed solve requests
- `nsp-pro-dev-email-queue` - Main queue for email messages
- `nsp-pro-dev-email-dlq` - Dead-letter queue for failed email sends

**Queue URLs:**
```
http://localhost:4566/000000000000/nsp-pro-dev-solve-queue
http://localhost:4566/000000000000/nsp-pro-dev-email-queue
```

**Usage:**

In `docker-compose.tests.local.yml` the script is mounted into the LocalStack container as a native init hook (`/etc/localstack/init/ready.d/init-sqs.sh`) and runs automatically once LocalStack is ready — the `localstack` healthcheck only reports healthy after the hook succeeds. In the other compose files it runs via a dedicated `localstack-init` service. To run manually:

```bash
# Make sure LocalStack is running
docker-compose up -d localstack

# Run the initialization script
./scripts/init-localstack-sqs.sh
```

**Note:** The script must stay executable (`chmod +x`) — LocalStack only runs executable ready.d hooks.

## Environment Variables

- `DEV_API_KEY`: Service authentication key (set in `.env.docker-compose.fastapi`)

## Troubleshooting

- If the script fails, check that all services are healthy: `docker-compose ps`
- Verify API key configuration in environment files
- Check logs: `docker-compose logs init-dev-user`
