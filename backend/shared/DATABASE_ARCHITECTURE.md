# Modern Database Architecture for NSP Pro

This document describes the new modern database architecture that replaces the legacy singleton pattern with dependency injection, supporting both MongoDB Atlas and AWS DocumentDB.

## Overview

The new architecture provides:
- **Database Abstraction**: Support for MongoDB Atlas and AWS DocumentDB through a common interface
- **Dependency Injection**: No more singleton pattern, proper dependency management
- **Async Support**: Full async/await support for better performance
- **Type Safety**: Proper TypeScript-like typing with generics
- **Configuration Management**: Environment-driven configuration with validation
- **Repository Pattern**: Base repository with common CRUD operations

## Core Components

### 1. DatabaseInterface

The foundation interface that both MongoDB and DocumentDB providers implement:

```python
from shared.database import DatabaseInterface

# Common interface for all database providers
class DatabaseInterface(ABC):
    async def connect(self) -> None: ...
    async def disconnect(self) -> None: ...
    def get_database(self) -> Database: ...
    async def health_check(self) -> bool: ...
```

### 2. DatabaseConfig

Configuration management with environment variable support:

```python
from shared.database import DatabaseConfig, DatabaseType

# Load from environment variables
config = DatabaseConfig.from_env()

# Or create manually
config = DatabaseConfig(
    database_type=DatabaseType.MONGODB,
    mongodb_uri="mongodb://localhost:27017",
    database_name="nsp_pro"
)
```

### 3. Database Providers

Concrete implementations for different database types:

```python
from shared.database import MongoDBProvider, DocumentDBProvider

# MongoDB Atlas provider
mongodb = MongoDBProvider(config)
await mongodb.connect()

# AWS DocumentDB provider  
documentdb = DocumentDBProvider(config)
await documentdb.connect()
```

### 4. DatabaseFactory

Factory for creating database providers:

```python
from shared.database import DatabaseFactory

# Create provider based on configuration
provider = DatabaseFactory.create_provider(config)

# Create and connect in one step
provider = await DatabaseFactory.create_and_connect(config)
```

### 5. DatabaseContainer

Dependency injection container for managing database instances:

```python
from shared.database import setup_database_config, get_database

# Setup configuration
setup_database_config(config, name="default")

# Get database instance anywhere in your code
database = await get_database("default")
```

### 6. BaseRepository

Generic repository base class for common CRUD operations:

```python
from shared.database import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, database=None, database_name="default"):
        super().__init__("users", database, database_name)
    
    def _document_to_entity(self, doc: Dict[str, Any]) -> User:
        return User(**doc)
```

### 7. DatabaseCollections

Modern collections manager with dependency injection:

```python
from shared.database import DatabaseCollections

collections = DatabaseCollections()
users_collection = await collections.get_users()
```

## Usage Patterns

### Basic Usage

```python
import asyncio
from shared.database import (
    DatabaseConfig, DatabaseType, 
    setup_database_config, get_database
)

async def main():
    # Setup configuration
    config = DatabaseConfig(
        database_type=DatabaseType.MONGODB,
        mongodb_uri="mongodb://localhost:27017",
        database_name="nsp_pro"
    )
    setup_database_config(config)
    
    # Use database
    database = await get_database()
    db = database.get_database()
    
    # Perform operations
    collection = db["users"]
    result = await asyncio.to_thread(collection.find_one, {"email": "test@example.com"})
    
    print(f"Found user: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Repository Pattern

```python
from shared.database import BaseRepository

class UserRepository(BaseRepository[dict]):
    def __init__(self, database=None):
        super().__init__("users", database)
    
    async def find_by_email(self, email: str):
        return await self.find_many({"email": email}, limit=1)

# Usage
user_repo = UserRepository()
user = await user_repo.find_by_email("test@example.com")
```

### Multi-Database Setup

```python
# Setup multiple databases
dev_config = DatabaseConfig(database_type=DatabaseType.MONGODB, ...)
setup_database_config(dev_config, name="development")

prod_config = DatabaseConfig(database_type=DatabaseType.DOCUMENTDB, ...)  
setup_database_config(prod_config, name="production")

# Use different databases
dev_db = await get_database("development")
prod_db = await get_database("production")
```

## Environment Variables

The system supports these environment variables:

### Common Settings
- `DATABASE_TYPE`: "mongodb" or "documentdb" (default: "mongodb")
- `DATABASE_NAME`: Database name (required)

### MongoDB Settings
- `DATABASE_CONNECTION_STRING`: MongoDB connection URI (required for MongoDB)

### DocumentDB Settings
- `DATABASE_CONNECTION_STRING`: DocumentDB connection string (optional)
- `DATABASE_USERNAME`: DocumentDB username
- `DATABASE_PASSWORD`: DocumentDB password  
- `DATABASE_SSL_CA_FILE`: Path to SSL CA certificate file

## Migration from Legacy Code

### Old Pattern (Singleton)
```python
from shared.database import MongoDB

# Old way - singleton pattern
db = MongoDB.get_database()
collection = db["users"]
```

### New Pattern (Dependency Injection)
```python
from shared.database import get_database

# New way - dependency injection
database = await get_database()
db = database.get_database()
collection = db["users"]
```

### Repository Migration
```python
# Old BaseRepository
from shared.database.base import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self, db=None):
        super().__init__(db)
        self.collection = self.db["users"]

# New BaseRepository  
from shared.database import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, database=None):
        super().__init__("users", database)
```

## Configuration Examples

### MongoDB Atlas
```bash
export DATABASE_TYPE=mongodb
export DATABASE_CONNECTION_STRING="mongodb+srv://user:pass@cluster.mongodb.net"
export DATABASE_NAME=nsp_pro
```

### AWS DocumentDB
```bash
export DATABASE_TYPE=documentdb
export DATABASE_USERNAME=admin
export DATABASE_PASSWORD=password123
export DATABASE_SSL_CA_FILE=global-bundle.pem
export DATABASE_NAME=nsp_pro
```

## Best Practices

1. **Always use async/await** for database operations
2. **Use dependency injection** instead of importing global singletons
3. **Configure once** at application startup with `setup_database_config()`
4. **Use repositories** for business logic, collections for simple operations
5. **Implement proper cleanup** with `shutdown_databases()` on app shutdown
6. **Use type hints** for better code quality and IDE support

## Error Handling

```python
from shared.database import get_database

async def safe_database_operation():
    try:
        database = await get_database()
        
        # Check health before operations
        if not await database.health_check():
            raise ConnectionError("Database not healthy")
        
        # Perform operations
        db = database.get_database()
        # ... operations
        
    except Exception as e:
        logger.error(f"Database operation failed: {e}")
        raise
```

## Testing

For testing, you can inject mock databases:

```python
import pytest
from unittest.mock import AsyncMock
from shared.database import BaseRepository

@pytest.fixture
async def mock_database():
    mock_db = AsyncMock()
    return mock_db

async def test_user_repository(mock_database):
    repo = UserRepository(database=mock_database)
    # Test repository operations
```

This modern architecture provides a clean, maintainable, and scalable foundation for database operations in NSP Pro services.
