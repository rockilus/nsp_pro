# import pytest
# from pymongo.errors import DuplicateKeyError
# from shared.database_pymongo.schemas.user import UserUpdateSchema
# from shared.database_pymongo.repositories.base import BaseCRUD


# def test_create_user(user_repository, sample_user):
#     """Test creating a new user."""
#     user = user_repository.create_user(sample_user)
#     assert user is not None
#     assert user.id == sample_user.id
#     assert user.email == sample_user.email
#     assert user.first_name == sample_user.first_name
#     assert user.last_name == sample_user.last_name
#     assert user.language == sample_user.language


# def test_create_duplicate_email(user_repository, created_user, sample_user):
#     """Test creating a user with duplicate email raises error."""
#     duplicate_user = sample_user.model_copy(update={"id": "different_id"})
#     with pytest.raises(ValueError) as excinfo:
#         user_repository.create_user(duplicate_user)
#     assert "already exists" in str(excinfo.value)


# def test_find_by_id(user_repository, created_user):
#     """Test finding a user by ID."""
#     user = user_repository.find_by_id(created_user.id)
#     assert user is not None
#     assert user.id == created_user.id
#     assert user.email == created_user.email


# def test_find_by_email(user_repository, created_user):
#     """Test finding a user by email."""
#     user = user_repository.find_by_email(created_user.email)
#     assert user is not None
#     assert user.id == created_user.id
#     assert user.email == created_user.email


# def test_find_by_email_not_found(user_repository):
#     """Test finding a user by non-existent email returns None."""
#     user = user_repository.find_by_email("nonexistent@example.com")
#     assert user is None


# def test_update_user(user_repository, created_user):
#     """Test updating a user."""
#     update_data = UserUpdateSchema(first_name="Updated", last_name="Name")

#     updated_user = user_repository.update_user(created_user.id, update_data)

#     assert updated_user is not None
#     assert updated_user.id == created_user.id
#     assert updated_user.email == created_user.email
#     assert updated_user.first_name == "Updated"
#     assert updated_user.last_name == "Name"
#     assert updated_user.language == created_user.language


# def test_update_user_email(user_repository, created_user):
#     """Test updating a user's email."""
#     update_data = UserUpdateSchema(email="newemail@example.com")

#     updated_user = user_repository.update_user(created_user.id, update_data)

#     assert updated_user is not None
#     assert updated_user.id == created_user.id
#     assert updated_user.email == "newemail@example.com"

#     # Verify the user can be found with the new email
#     user = user_repository.find_by_email("newemail@example.com")
#     assert user is not None
#     assert user.id == created_user.id


# def test_update_user_duplicate_email(user_repository, created_user):
#     """Test updating a user with an email that already exists."""
#     # Create another user
#     second_user = user_repository.create_user(
#         sample_user=created_user.model_copy().model_copy(
#             update={"id": "user_test_002", "email": "second@example.com"}
#         )
#     )

#     # Try to update second user with first user's email
#     update_data = UserUpdateSchema(email=created_user.email)

#     with pytest.raises(ValueError) as excinfo:
#         user_repository.update_user(second_user.id, update_data)

#     assert "already exists" in str(excinfo.value)


# def test_update_user_not_found(user_repository):
#     """Test updating a non-existent user returns None."""
#     update_data = UserUpdateSchema(first_name="Not", last_name="Found")

#     updated_user = user_repository.update_user("nonexistent_id", update_data)

#     assert updated_user is None


# def test_add_worker(user_repository, created_user):
#     """Test adding a worker to a user."""
#     worker_id = "worker_001"

#     updated_user = user_repository.add_worker(created_user.id, worker_id)

#     assert updated_user is not None
#     assert worker_id in updated_user.workers
#     assert len(updated_user.workers) == 1


# def test_add_duplicate_worker(user_repository, created_user):
#     """Test adding the same worker twice only adds it once."""
#     worker_id = "worker_002"

#     user_repository.add_worker(created_user.id, worker_id)
#     updated_user = user_repository.add_worker(created_user.id, worker_id)

#     assert updated_user is not None
#     assert worker_id in updated_user.workers
#     assert len(updated_user.workers) == 1


# def test_remove_worker(user_repository, created_user):
#     """Test removing a worker from a user."""
#     worker_id = "worker_003"

#     # First add the worker
#     user_repository.add_worker(created_user.id, worker_id)

#     # Now remove it
#     updated_user = user_repository.remove_worker(created_user.id, worker_id)

#     assert updated_user is not None
#     assert worker_id not in updated_user.workers
#     assert len(updated_user.workers) == 0


# def test_remove_nonexistent_worker(user_repository, created_user):
#     """Test removing a worker that doesn't exist."""
#     updated_user = user_repository.remove_worker(
#         created_user.id, "nonexistent_worker"
#     )

#     assert updated_user is not None
#     assert len(updated_user.workers) == 0


# def test_find_by_language(user_repository, created_user):
#     """Test finding users by language."""
#     # Create a second user with different language
#     second_user = user_repository.create_user(
#         sample_user=created_user.model_copy().model_copy(
#             update={
#                 "id": "user_test_003",
#                 "email": "french@example.com",
#                 "language": "fr",
#             }
#         )
#     )

#     # Find users with English language
#     en_users = user_repository.find_by_language("en")
#     assert len(en_users) == 1
#     assert en_users[0].id == created_user.id

#     # Find users with French language
#     fr_users = user_repository.find_by_language("fr")
#     assert len(fr_users) == 1
#     assert fr_users[0].id == second_user.id

#     # Find users with non-existent language
#     es_users = user_repository.find_by_language("es")
#     assert len(es_users) == 0
