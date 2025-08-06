from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.user import UserSchema
from shared.schemas.core.user import User


class UserRepository(BaseRepository[UserSchema]):
    """Repository for user documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "users", UserSchema)

    def create_user(self, user: User) -> User:
        """Create a new user."""
        user_schema = UserSchema.from_core(user)
        doc = user_schema.to_mongo()
        self.collection.insert_one(doc)
        return user

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

    def get_users_by_ids(self, user_ids: List[str]) -> List[User]:
        """Get users by a list of IDs."""
        users = self.find_all({"_id": {"$in": user_ids}})
        return [user.to_core() for user in users]

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
