from bson import ObjectId

from core.user import User
from database.db import DB
from models.user import User as UserDocument


class UserDB:
    def __init__(self, db: DB):
        self.db = db

    def create_user(
        self,
        user: User,
    ) -> User:
        user_doc = UserDocument(
            id=str(ObjectId()),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            workers=[],
        )
        user_saved = user_doc.save()
        return _from_mongo_user(user_saved)

    def get_user_by_id(self, user_id: str) -> User:
        # pylint: disable=no-member
        user = UserDocument.objects.get(id=user_id)  # type: ignore
        return _from_mongo_user(user)

    def get_user_by_email(self, email: str) -> User | None:
        try:
            # pylint: disable=no-member
            user = UserDocument.objects.get(username=email)  # type: ignore
            return _from_mongo_user(user)
        except UserDocument.DoesNotExist:
            return None

    def update_user(self, user: User) -> User:
        document = to_mongo_user(user)
        document_saved = document.save()
        return _from_mongo_user(document_saved)

    def delete_user(self, user_id: str) -> None:
        # pylint: disable=no-member
        user = UserDocument.objects.get(id=user_id)  # type: ignore
        user.delete()


# Mappers
def to_mongo_user(dataclass_obj: User) -> UserDocument:
    return UserDocument(
        id=dataclass_obj.id,
        email=dataclass_obj.email,
        first_name=dataclass_obj.first_name,
        last_name=dataclass_obj.last_name,
        workers=[],
    )


def _from_mongo_user(doc_obj: UserDocument) -> User:
    return User(
        id=doc_obj.id,
        email=doc_obj.email,
        first_name=doc_obj.first_name if doc_obj.first_name else "",
        last_name=doc_obj.last_name if doc_obj.last_name else "",
        workers=[],
    )
