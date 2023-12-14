from bson import ObjectId

from core.user import User
from database.db import DB
from models.role import Role as RoleDocument
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
            username=user.username,
            hashed_password=user.hashed_password,
            first_name=user.first_name,
            last_name=user.last_name,
            roles=user.roles,
        )
        user_saved = user_doc.save()
        return _from_mongo_user(user_saved)

    def get_user_by_id(self, user_id: str) -> User:
        # pylint: disable=no-member
        user = UserDocument.objects.get(id=user_id)  # type: ignore
        return _from_mongo_user(user)

    def get_user_by_username(self, username: str) -> User | None:
        try:
            # pylint: disable=no-member
            user = UserDocument.objects.get(username=username)  # type: ignore
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
    # pylint: disable=no-member
    roles = RoleDocument.objects.get(name__in=dataclass_obj.roles)  # type: ignore
    return UserDocument(
        id=dataclass_obj.id,
        username=dataclass_obj.username,
        hashed_password=dataclass_obj.hashed_password,
        first_name=dataclass_obj.first_name,
        last_name=dataclass_obj.last_name,
        roles=roles,
    )


def _from_mongo_user(doc_obj: UserDocument) -> User:
    return User(
        id=doc_obj.id,
        username=doc_obj.username,
        hashed_password=doc_obj.hashed_password,
        first_name=doc_obj.first_name,
        last_name=doc_obj.last_name,
        roles=[r.name for r in doc_obj.roles],
    )
