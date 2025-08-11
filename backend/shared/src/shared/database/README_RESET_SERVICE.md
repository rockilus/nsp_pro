# Database Reset Service

A utility service for safely resetting database collections in test environments.

## Features

- **Environment Safety**: Only works in test/development environments
- **Selective Reset**: Can reset all collections or specific ones
- **Dry Run Mode**: Preview what would be reset without making changes
- **Comprehensive Logging**: Detailed operation tracking and audit trail
- **Async Support**: Fully async/await compatible

## Usage

### Basic Reset

```python
from shared.database.reset_service import reset_database

# Reset all collections
result = await reset_database()

# Reset specific collections
result = await reset_database(["teams", "users"])

# Synchronous version
result = reset_database_sync(["teams", "users"])
```

### Advanced Usage

```python
from shared.database.reset_service import DatabaseResetService

service = DatabaseResetService()

# Check what would be reset (dry run)
collections = await service.get_collections_to_reset()
print(f"Would reset: {collections}")

# Reset all collections
result = await service.reset_all_collections()

# Reset specific collections
result = await service.reset_specific_collections(["teams", "users"])
```

### CLI Usage

```bash
# Reset all collections
python -m shared.database.reset_service --all

# Reset specific collections
python -m shared.database.reset_service --collections teams users

# Dry run to see what would be reset
python -m shared.database.reset_service --dry-run --all
```

## Environment Configuration

The service uses the following environment variables:

- `ENVIRONMENT`: Must be "test", "testing", "local", or "development"
- `DB_DATABASE_NAME`: Database name (should contain "test" for additional safety)
- `DB_MONGODB_URI` or DocumentDB settings for connection

## Safety Features

1. **Environment Validation**: 
   - Checks `ENVIRONMENT` variable
   - Validates database name patterns
   - Explicitly rejects production environments

2. **Operation Logging**:
   - Each reset operation gets a unique ID
   - Comprehensive logging of all actions
   - Success/failure tracking

3. **Graceful Error Handling**:
   - Continues with other collections if one fails
   - Detailed error reporting
   - Rollback safety (collections recreated automatically)

## Integration with E2E Tests

```typescript
// In Playwright tests
import { DatabaseTestUtils } from './utils/database-utils';

const dbUtils = new DatabaseTestUtils();

test.beforeEach(async ({ page }) => {
  // Reset database before each test
  await dbUtils.resetDatabase({
    collections: ["teams", "users", "workers"],
    preserveSystemData: true
  });
  
  // Continue with test setup...
});
```

## Error Handling

The service raises `DatabaseResetError` for:
- Production environment detection
- Database connection failures
- Permission issues

```python
try:
    await reset_database()
except DatabaseResetError as e:
    logger.error(f"Reset failed: {e}")
    # Handle appropriately
```

## Development

### Running Tests

```bash
cd backend/shared
poetry run pytest src/shared/database/tests/test_reset_service.py -v
```

### Adding New Collections

Collections are automatically discovered and reset. No manual configuration needed.

For collections requiring specific indexes or schemas, extend the `_recreate_specific_collections` method.

## Security Notes

- **Never run in production**: Multiple safety checks prevent this
- **Test environments only**: Requires explicit environment configuration  
- **Audit trail**: All operations are logged with unique IDs
- **Graceful degradation**: Partial failures don't break the entire reset

## Future Enhancements

- [ ] Collection schema preservation during recreation
- [ ] Backup creation before reset
- [ ] Integration with CI/CD pipelines
- [ ] Performance optimizations for large datasets
- [ ] Custom reset strategies per collection type
