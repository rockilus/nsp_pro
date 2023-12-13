from typing import List

from bson import ObjectId

from core.user import Role
from database.db import DB
from models.role import Role as RoleDocument


class RoleDB:
    def __init__(self, db: DB):
        self.db = db

    def create_role(
        self,
        role: Role,
    ) -> Role:
        role_doc = RoleDocument(
            id=str(ObjectId()),
            name=role.name,
            description=role.description,
            permissions=role.permissions,
        )
        role_saved = role_doc.save()
        return _from_mongo_role(role_saved)

    def get_roles(self) -> List[Role]:
        # pylint: disable=no-member
        roles = RoleDocument.objects.all()  # type: ignore
        return [_from_mongo_role(a) for a in list(roles)]

    def get_role_by_id(self, role_id: str) -> Role:
        # pylint: disable=no-member
        role = RoleDocument.objects.get(id=role_id)  # type: ignore
        return _from_mongo_role(role)

    def get_role_by_name(self, role_name: str) -> Role:
        # pylint: disable=no-member
        role = RoleDocument.objects.get(name=role_name)  # type: ignore
        return _from_mongo_role(role)

    def update_role(self, role: Role) -> Role:
        document = to_mongo_role(role)
        document_saved = document.save()
        return _from_mongo_role(document_saved)

    def delete_role(self, role_id: str) -> None:
        # pylint: disable=no-member
        role = RoleDocument.objects.get(id=role_id)  # type: ignore
        role.delete()


# Mappers
def to_mongo_role(dataclass_obj: Role) -> RoleDocument:
    return RoleDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
        description=dataclass_obj.description,
        permissions=dataclass_obj.permissions,
    )


def _from_mongo_role(doc_obj: RoleDocument) -> Role:
    return Role(
        id=doc_obj.id,
        name=doc_obj.name,
        description=doc_obj.description if doc_obj.description else "",
        permissions=doc_obj.permissions,
    )
