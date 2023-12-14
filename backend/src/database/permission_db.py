from typing import List

from bson import ObjectId

from core.user import Permission
from database.db import DB
from models.permission import Permission as PermissionDocument


class PermissionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_permission(
        self,
        permission: Permission,
    ) -> Permission:
        permission_doc = PermissionDocument(
            id=str(ObjectId()),
            name=permission.name,
            description=permission.description,
        )
        permission_saved = permission_doc.save()
        return _from_mongo_permission(permission_saved)

    def get_permissions(self) -> List[Permission]:
        # pylint: disable=no-member
        permissions = PermissionDocument.objects.all()  # type: ignore
        return [_from_mongo_permission(a) for a in list(permissions)]

    def get_permission_by_id(self, permission_id: str) -> Permission:
        # pylint: disable=no-member
        permission = PermissionDocument.objects.get(id=permission_id)  # type: ignore
        return _from_mongo_permission(permission)

    def update_permission(self, permission: Permission) -> Permission:
        document = to_mongo_permission(permission)
        document_saved = document.save()
        return _from_mongo_permission(document_saved)

    def delete_permission(self, permission_id: str) -> None:
        # pylint: disable=no-member
        permission = PermissionDocument.objects.get(id=permission_id)  # type: ignore
        permission.delete()


# Mappers
def to_mongo_permission(dataclass_obj: Permission) -> PermissionDocument:
    return PermissionDocument(
        id=dataclass_obj.id,
        name=dataclass_obj.name,
        description=dataclass_obj.description,
    )


def _from_mongo_permission(doc_obj: PermissionDocument) -> Permission:
    return Permission(
        id=doc_obj.id,
        name=doc_obj.name,
        description=doc_obj.description if doc_obj.description else "",
    )
