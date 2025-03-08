# from typing import Any, Dict, List, Optional

# from pymongo.errors import DuplicateKeyError, OperationFailure

# from shared.database_pymongo.repositories.base import BaseRepository
# from shared.database_pymongo.schemas.user import UserSchema
# from shared.logger.logger import log_info
# from shared.schemas.schemas.user import User


# class UserRepository(BaseRepository[UserSchema]):
#     """Repository for User documents."""

#     def __init__(self):
#         """Initialize UserRepository with collection name and schema class."""
#         super().__init__("users", UserSchema)
#         # Ensure email index for uniqueness
#         self.collection.create_index("email", unique=True)

#     def create_user(self, user: User) -> User:
#         """Create a new user with proper error handling and type conversion"""
#         try:
#             user_schema = UserSchema.from_core(user)
#             result = self.collection.insert_one(user_schema.to_mongo())
#             user_schema.id = result.inserted_id
#             if not result.acknowledged:
#                 raise OperationFailure("User creation not acknowledged by database")
#             return self._db_to_core_user(user_schema)
#         except DuplicateKeyError as e:
#             log_info("Duplicate user ID or email")
#             raise ValueError("User already exists") from e
#         except Exception as e:
#             log_info(f"Failed to create user: {str(e)}")
#             raise

#     def get_users(self) -> List[User]:
#         """Get all users with type conversion"""
#         try:
#             users = list(self.collection.find())
#             return [self._db_to_core_user(user) for user in users]
#         except OperationFailure as e:
#             log_info(f"Database operation failed: {str(e)}")
#             raise
#         except Exception as e:
#             log_info(f"Unexpected error fetching users: {str(e)}")
#             raise

#     def get_user_by_id(self, user_id: str) -> Optional[User]:
#         """Get single user by ID with proper null handling"""
#         try:
#             user = self.collection.find_one({"id": user_id})
#             return self._db_to_core_user(user) if user else None
#         except OperationFailure as e:
#             log_info(f"Database operation failed: {str(e)}")
#             raise
#         except Exception as e:
#             log_info(f"Unexpected error fetching user: {str(e)}")
#             raise

#     def get_user_by_email(self, email: str) -> Optional[User]:
#         """Get user by email with proper null handling"""
#         try:
#             user = self.collection.find_one({"email": email})
#             return self._db_to_core_user(user) if user else None
#         except OperationFailure as e:
#             log_info(f"Database operation failed: {str(e)}")
#             raise
#         except Exception as e:
#             log_info(f"Unexpected error fetching user: {str(e)}")
#             raise

#     def update_user(self, user: User) -> User:
#         """Full user update with existence check and error handling"""
#         try:
#             existing = self.collection.find_one({"id": user.id})
#             if not existing:
#                 raise ValueError("User does not exist")

#             user_dict = self._core_to_db_user(user)
#             result = self.collection.replace_one({"id": user.id}, user_dict)

#             if result.modified_count == 0:
#                 raise OperationFailure("User update failed")

#             return self._db_to_core_user(user_dict)
#         except OperationFailure as e:
#             log_info(f"Database operation failed: {str(e)}")
#             raise
#         except Exception as e:
#             log_info(f"Unexpected error updating user: {str(e)}")
#             raise

#     def delete_user(self, user_id: str) -> None:
#         """Delete user with proper error handling"""
#         try:
#             result = self.collection.delete_one({"id": user_id})
#             if result.deleted_count == 0:
#                 raise ValueError("User not found")
#         except OperationFailure as e:
#             log_info(f"Database operation failed: {str(e)}")
#             raise
#         except Exception as e:
#             log_info(f"Unexpected error deleting user: {str(e)}")
#             raise

#     def _core_to_db_user(self, user: User) -> UserSchema:
#         return UserSchema(
#             id=user.id,
#             email=user.email,
#             first_name=user.first_name,
#             last_name=user.last_name,
#             language=user.language,
#             sign_up_at=user.sign_up_at,
#             workers=user.workers,
#             impersonating_user_id=user.impersonating_user_id,
#         )

#     def _db_to_core_user(self, db_user: Dict[str, Any]) -> User:
#         """Convert database dictionary to core User type"""
#         return User(
#             id=db_user["id"],
#             email=db_user["email"],
#             first_name=db_user.get("first_name"),
#             last_name=db_user.get("last_name"),
#             workers=db_user.get("workers", []),
#             language=db_user["language"],
#             sign_up_at=db_user["sign_up_at"],
#             impersonating_user_id=db_user.get("impersonating_user_id"),
#         )
