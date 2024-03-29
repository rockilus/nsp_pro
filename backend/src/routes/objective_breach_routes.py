from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.schedule import ObjectiveBreach, Variable
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import ObjectiveBreachMessage, VariableMessage
from scripts.setup_database import objective_breach_db, schedule_db

router = APIRouter()


@router.get("/objective_breaches/teams/{team_id}")
async def get_objective_breaches(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ObjectiveBreachMessage]:
    if not await authz_check(
        session.get_user_id(), "read-objective-breaches", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get objective breaches",
        )
    team_schedules = schedule_db.get_schedules(team_id)
    objective_breaches = objective_breach_db.get_objective_breaches(team_schedules)
    return [objective_breach_to_api_msg(a) for a in objective_breaches]


@router.put("/objective_breaches/{objective_breach_id}/teams/{team_id}")
async def update_objective_breach(
    objective_breach_id: str,
    team_id: str,
    objective_breach_api: ObjectiveBreachMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ObjectiveBreachMessage:
    if not await authz_check(
        session.get_user_id(), "update-objective-breach", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update objective breaches",
        )
    existing_objective_breach = objective_breach_db.get_objective_breach_by_id(
        objective_breach_id
    )
    if not existing_objective_breach:
        raise HTTPException(status_code=404, detail="ObjectiveBreach does not exist")
    objective_breach_data = api_msg_to_objective_breach(objective_breach_api)
    updated_objective_breach = objective_breach_db.update_objective_breach(
        objective_breach_data
    )
    return objective_breach_to_api_msg(updated_objective_breach)


@router.delete("/objective_breaches/{objective_breach_id}/teams/{team_id}")
async def delete_objective_breach(
    objective_breach_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await authz_check(
        session.get_user_id(), "delete-objective-breach", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete objective breaches",
        )
    objective_breach_db.delete_objective_breach(objective_breach_id)
    return {"message": "ObjectiveBreach deleted"}


def objective_breach_to_api_msg(
    objective_breach: ObjectiveBreach,
) -> ObjectiveBreachMessage:
    data = asdict(objective_breach)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ObjectiveBreachMessage)
    return validator.validate_python(as_dict)


def api_msg_to_variable(msg: VariableMessage) -> Variable:
    data_snake = humps.decamelize(msg.model_dump())
    return Variable(**data_snake)


def api_msg_to_objective_breach(
    msg: ObjectiveBreachMessage,
) -> ObjectiveBreach:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["variables"] = [api_msg_to_variable(v) for v in msg.variables]
    return ObjectiveBreach(**data_snake)
