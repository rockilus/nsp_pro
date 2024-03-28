from core.user import User
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models.user import User as UserDocument
from services.logging import log_info


class UserDB:
    def __init__(self, db: DB):
        self.db = db

    def create_user(self, user: User) -> User:
        user_doc = core_to_doc_user(user)
        try:
            user_saved = user_doc.save()
        except Exception as e:
            log_info(f"Failed to save user to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_user(user_saved)

    def get_user_by_id(self, user_id: str) -> User:
        try:
            # pylint: disable=no-member
            user = UserDocument.objects.get(id=user_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get user by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_user(user)

    def get_user_by_email(self, email: str) -> User | None:
        try:
            # pylint: disable=no-member
            user = UserDocument.objects.get(email=email)  # type: ignore
        except UserDocument.DoesNotExist:
            return None
        except Exception as e:
            log_info(f"Failed to get user by email from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_user(user)

    def update_user(self, user: User) -> User:
        document = core_to_doc_user(user)
        try:
            document_saved = document.save()
        except Exception as e:
            log_info(f"Failed to update user to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_user(document_saved)

    def delete_user(self, user_id: str) -> None:
        try:
            # pylint: disable=no-member
            user = UserDocument.objects.get(id=user_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get user by id to delete from database: {e}")
            handle_get_document_error(e)
        try:
            user.delete()
        except Exception as e:
            log_info(f"Failed to delete user from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_user(dataclass_obj: User) -> UserDocument:
    try:
        u_doc = UserDocument(
            id=dataclass_obj.id,
            email=dataclass_obj.email,
            first_name=dataclass_obj.first_name,
            last_name=dataclass_obj.last_name,
            workers=[],
        )
    except Exception as e:
        log_info(f"Failed to convert User to UserDocument: {e}")
        handle_create_document_error(e)
    return u_doc


# document to core
def doc_to_core_user(doc_obj: UserDocument) -> User:
    try:
        user = User(
            id=doc_obj.id,
            email=doc_obj.email,
            first_name=doc_obj.first_name if doc_obj.first_name else "",
            last_name=doc_obj.last_name if doc_obj.last_name else "",
            workers=[],
        )
    except Exception as e:
        log_info(f"Failed to convert UserDocument to User: {e}")
        handle_create_core_object_error(e)
    return user
