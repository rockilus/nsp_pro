from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.user import Role
from routes.api_model import RoleMessage
from scripts.setup_database import role_db

router = APIRouter()


@router.post("/roles", status_code=201)
def create_role(req: RoleMessage) -> RoleMessage:
    r_data = api_msg_to_role(req)
    role = role_db.create_role(r_data)
    return role_to_api_msg(role)


@router.get("/roles")
def get_roles() -> List[RoleMessage]:
    roles = role_db.get_roles()
    return [role_to_api_msg(r) for r in roles]


@router.put("/roles/{role_id}")
def update_role(role_id: str, role_api: RoleMessage) -> RoleMessage:
    existing_role = role_db.get_role_by_id(role_id)
    if not existing_role:
        raise HTTPException(status_code=404, detail="Role does not exist")
    role_data = api_msg_to_role(role_api)
    updated_role = role_db.update_role(role_data)
    return role_to_api_msg(updated_role)


@router.delete("/roles/{role_id}")
def delete_role(role_id: str) -> Dict:
    role_db.delete_role(role_id)
    return {"message": "Role deleted"}


def role_to_api_msg(role: Role) -> RoleMessage:
    data = asdict(role)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(RoleMessage)
    return validator.validate_python(as_dict)


def api_msg_to_role(
    msg: RoleMessage,
) -> Role:
    data_snake = humps.decamelize(msg.model_dump())
    return Role(**data_snake)
