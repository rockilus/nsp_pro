# Database Reset Implementation for E2E Testing

This implementation provides a complete database reset solution for E2E testing across the NSP Pro application.

## 🏗️ Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Playwright Tests  │    │   API Gateway       │    │   Shared Module     │
│                     │    │                     │    │                     │
│ • database-utils.ts │───►│ • test_utils_routes │───►│ • reset_service.py  │
│ • global-setup.ts   │    │ • safety validation │    │ • environment check │
│ • test specs        │    │ • error handling    │    │ • collection mgmt   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## 📁 File Structure

### Backend (Shared Module)
```
backend/shared/src/shared/database/
├── reset_service.py              # Core reset service
├── config.py                     # Enhanced with environment detection
├── tests/test_reset_service.py   # Unit tests
└── README_RESET_SERVICE.md       # Detailed documentation
```

### Backend (API Gateway)
```
backend/api_gateway/src/
├── routes/test_utils_routes.py           # Test utility endpoints
└── tests/routes/test_test_utils_routes.py # API endpoint tests
```

### Frontend
```
frontend/tests/
├── utils/
│   ├── database-utils.ts          # TypeScript utility for API calls
│   ├── global-setup.ts           # Global test setup
│   └── global-teardown.ts        # Global test cleanup
├── test-with-db-reset.spec.ts    # Enhanced test example
└── test-1.spec.ts                # Original test file
```

## 🚀 Usage Examples

### Basic Test with Database Reset

```typescript
import { test, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./utils/database-utils";

const dbUtils = new DatabaseTestUtils();

test.beforeEach(async ({ page }) => {
  // Reset specific collections before each test
  await dbUtils.resetTeamRelatedData();
  
  await page.goto("http://localhost:3000/en/plan/settings/teams/");
  await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
});

test("should create a new team", async ({ page }) => {
  // Your test logic here - database is guaranteed to be clean
});
```

### Advanced Reset Options

```typescript
// Reset all collections
await dbUtils.resetAllData();

// Reset specific collections
await dbUtils.resetDatabase({
  collections: ["teams", "users", "workers"],
  preserveSystemData: true
});

// Preview what would be reset (dry run)
const preview = await dbUtils.dryRunReset(["teams", "users"]);
console.log(`Would reset: ${preview.collections_to_reset.join(", ")}`);

// Reset scheduling-related data
await dbUtils.resetSchedulingData();
```

## 🔧 API Endpoints

### POST `/test-utils/reset-database`
Reset database collections with safety validation.

**Request:**
```json
{
  "collections": ["teams", "users"],  // Optional: specific collections
  "preserve_system_data": true,       // Optional: preserve system data
  "confirmation_token": "test-reset-confirm"  // Required safety token
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully reset 2 collections",
  "collections_reset": ["teams", "users"],
  "timestamp": "2025-08-11T10:00:00Z",
  "operation_id": "reset_20250811_100000_123456"
}
```

### GET `/test-utils/reset-database/dry-run`
Preview collections that would be reset.

**Query Parameters:**
- `collections` (optional): Comma-separated list of collections

**Response:**
```json
{
  "collections_to_reset": ["teams", "users", "workers"],
  "total_count": 3,
  "requested_collections": ["teams", "users"],
  "dry_run": true
}
```

### GET `/test-utils/health`
Check test utilities health and availability.

**Response:**
```json
{
  "status": "healthy",
  "environment": "test",
  "test_utilities_available": true
}
```

## 🛡️ Safety Features

### Multi-Layer Environment Validation
1. **Environment Variable Check**: `ENVIRONMENT` must be test/development
2. **Database Name Validation**: Must contain "test" or be in local environment
3. **Production Detection**: Explicitly rejects production environments
4. **Confirmation Token**: Additional safety measure for API calls

### Operation Tracking
- Unique operation IDs for each reset
- Comprehensive logging with timestamps
- Success/failure statistics
- Audit trail for all operations

### Error Handling
- Graceful degradation (continues with other collections if one fails)
- Detailed error messages and logging
- HTTP status codes for API integration
- TypeScript error handling in frontend utilities

## 🔧 Configuration

### Environment Variables
```bash
# Required for test utilities to work
ENVIRONMENT=test                    # or "development", "local"
DB_DATABASE_NAME=nsp_pro_test      # Must contain "test" for additional safety

# MongoDB Connection
DB_MONGODB_URI=mongodb://localhost:27017
DB_CONNECTION_TIMEOUT_MS=30000

# Or DocumentDB settings
DB_DOCUMENTDB_HOST=your-cluster.cluster-xxx.docdb.amazonaws.com
DB_DOCUMENTDB_USERNAME=testuser
DB_DOCUMENTDB_PASSWORD=testpass
```

### Playwright Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve('./tests/utils/global-setup.ts'),
  globalTeardown: require.resolve('./tests/utils/global-teardown.ts'),
  
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../backend/api_gateway && poetry run python -m src.main',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});
```

## 🚦 Running Tests

### Prerequisites
1. Start backend API Gateway: `cd backend/api_gateway && poetry run python -m src.main`
2. Start frontend: `cd frontend && npm run dev`
3. Ensure environment variables are set for test environment

### Run Tests
```bash
# Run all tests with database reset
npx playwright test

# Run specific test file
npx playwright test test-with-db-reset.spec.ts

# Run tests in headed mode for debugging
npx playwright test --headed

# Run tests with debugging
npx playwright test --debug
```

### Manual Testing
```bash
# Test the reset service directly
cd backend/shared
poetry run python -m src.shared.database.reset_service --dry-run --all

# Test the API endpoint
curl -X POST http://localhost:8000/test-utils/reset-database \
  -H "Content-Type: application/json" \
  -d '{"confirmation_token": "test-reset-confirm"}'
```

## 📊 Monitoring and Debugging

### Logs
- **Backend**: Loguru logs with operation IDs in API Gateway logs
- **Frontend**: Console logs in global setup/teardown
- **Database**: MongoDB logs for connection and operation tracking

### Health Checks
```typescript
// Check if test utilities are available
const health = await dbUtils.checkHealth();
console.log('Test utilities available:', health.test_utilities_available);

// Wait for API to be ready
await dbUtils.waitForApiReady(10000);
```

### Troubleshooting

**Problem**: Test utilities not available
- **Solution**: Check `ENVIRONMENT` variable and database name patterns

**Problem**: Database reset fails
- **Solution**: Verify MongoDB connection and permissions

**Problem**: Tests are not isolated
- **Solution**: Ensure `beforeEach` calls reset methods properly

**Problem**: API not ready
- **Solution**: Increase timeout in `waitForApiReady()` or check backend startup

## 🔮 Future Enhancements

- [ ] Backup creation before reset operations
- [ ] Custom reset strategies per collection type
- [ ] Integration with CI/CD pipelines
- [ ] Performance optimizations for large datasets
- [ ] Schema preservation during collection recreation
- [ ] Real-time reset progress tracking
- [ ] Database migration state management

## 🤝 Contributing

When adding new collections or modifying the reset logic:

1. Update collection lists in `resetTeamRelatedData()` and similar methods
2. Add tests for new functionality
3. Update this documentation
4. Ensure safety mechanisms are maintained
5. Test in multiple environments

## 📞 Support

For issues or questions:
1. Check the logs for operation IDs and error details
2. Verify environment configuration
3. Test the health endpoints
4. Review the comprehensive error messages in the console output
