from typing import List, Optional

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.user import UserSchema
from shared.schemas.schemas.user import User


class UserRepository(BaseRepository[UserSchema]):
    """Repository for user documents using PyMongo."""

    def __init__(self):
        super().__init__("users", UserSchema)

    def create_user(self, user: User) -> User:
        """Create a new user."""
        user_schema = UserSchema.from_core(user)
        result = self.create(user_schema)
        return result.to_core()

    def get_users(self) -> List[User]:
        """Get all users."""
        users = self.find_all()
        return [user.to_core() for user in users]

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by its ID."""
        user = self.find_by_id(user_id)
        return user.to_core() if user else None

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by its email."""
        users = self.find_all({"email": email})
        return users[0].to_core() if users else None

    def update_user(self, user: User) -> User:
        """Update a user."""
        user_schema = UserSchema.from_core(user)
        user_updated = self.update(user_schema)
        assert user_updated is not None
        return user_updated.to_core()

    def delete_user(self, user_id: str) -> None:
        """Delete a user by its ID."""
        result = self.delete(user_id)
        if result is False:
            raise Exception(f"User with id {user_id} not found or already deleted")
