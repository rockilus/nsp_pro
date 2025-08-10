# Development User Initialization

This directory contains scripts for setting up a test user in the development environment.

## Files

- `init-dev-user.sh`: Shell script that calls the `/users/onboard` endpoint to create a test user
- `Dockerfile.init-user`: Docker container definition for running the init script

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

## Environment Variables

- `DEV_API_KEY`: Service authentication key (set in `.env.docker-compose.fastapi`)

## Troubleshooting

- If the script fails, check that all services are healthy: `docker-compose ps`
- Verify API key configuration in environment files
- Check logs: `docker-compose logs init-dev-user`
