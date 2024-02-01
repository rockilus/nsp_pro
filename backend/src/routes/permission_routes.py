from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.user import Permission
from routes.api_model import PermissionMessage
from scripts.setup_database import permission_db

router = APIRouter()


@router.post("/permissions", status_code=201)
def create_permission(req: PermissionMessage) -> PermissionMessage:
    p_data = api_msg_to_permission(req)
    permission = permission_db.create_permission(p_data)
    return permission_to_api_msg(permission)


@router.get("/permissions")
def get_permissions() -> List[PermissionMessage]:
    permissions = permission_db.get_permissions()
    return [permission_to_api_msg(p) for p in permissions]


@router.put("/permissions/{permission_id}")
def update_permission(
    permission_id: str, permission_api: PermissionMessage
) -> PermissionMessage:
    existing_permission = permission_db.get_permission_by_id(permission_id)
    if not existing_permission:
        raise HTTPException(status_code=404, detail="Permission does not exist")
    permission_data = api_msg_to_permission(permission_api)
    updated_permission = permission_db.update_permission(permission_data)
    return permission_to_api_msg(updated_permission)


@router.delete("/permissions/{permission_id}")
def delete_permission(permission_id: str) -> Dict:
    permission_db.delete_permission(permission_id)
    return {"message": "Permission deleted"}


def permission_to_api_msg(permission: Permission) -> PermissionMessage:
    data = asdict(permission)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(PermissionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_permission(
    msg: PermissionMessage,
) -> Permission:
    data_snake = humps.decamelize(msg.model_dump())
    return Permission(**data_snake)
