from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import Breach, ObjectiveCategory, Variable
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import BreachMessage, VariableMessage
from scripts.setup_database import breach_db, schedule_db

router = APIRouter()


@router.get("/breaches/teams/{team_id}")
async def get_objective_breaches(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[BreachMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-objective-breaches", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get objective breaches",
            )
        team_schedules = schedule_db.get_schedules(team_id)
        objective_breaches = breach_db.get_breaches(team_schedules)
        response = [core_to_msg_objective_breach(a) for a in objective_breaches]
    except Exception as e:
        log_info("Failed to get objective breaches")
        handle_routes_errors(e)
    return response


@router.put("/breaches/{objective_breach_id}/teams/{team_id}")
async def update_objective_breach(
    team_id: str,
    objective_breach_api: BreachMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> BreachMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-objective-breach", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update objective breaches",
            )
        objective_breach_data = msg_to_core_objective_breach(objective_breach_api)
        updated_objective_breach = breach_db.update_breach(objective_breach_data)
        response = core_to_msg_objective_breach(updated_objective_breach)
    except Exception as e:
        log_info("Failed to update objective breach")
        handle_routes_errors(e)
    return response


@router.delete("/breaches/{objective_breach_id}/teams/{team_id}")
async def delete_objective_breach(
    objective_breach_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-objective-breach", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete objective breaches",
            )
        breach_db.delete_breach(objective_breach_id)
    except Exception as e:
        log_info("Failed to delete objective breach")
        handle_routes_errors(e)
    return {"message": "ObjectiveBreach deleted"}


# Mappers
# core to message
def core_to_msg_variable(variable: Variable) -> VariableMessage:
    try:
        data = asdict(variable)
    except Exception as e:
        log_info("Failed to convert Variable to dictionary")
        raise MessageTypeError(str(e)) from e
    data["date"] = datetime.combine(
        variable.date, time.min, tzinfo=timezone.utc
    ).timestamp()
    as_dict = humps.camelize(data)
    validator = TypeAdapter(VariableMessage)
    try:
        variable_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Variable to VariableMessage")
        handle_message_errors(e)
    return variable_msg


def core_to_msg_objective_breach(breach: Breach) -> BreachMessage:
    try:
        data = asdict(breach)
    except Exception as e:
        log_info("Failed to convert ObjectiveBreach to dictionary")
        raise MessageTypeError(str(e)) from e
    data["variables"] = [core_to_msg_variable(v) for v in breach.variables]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(BreachMessage)
    try:
        ob_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert ObjectiveBreach to ObjectiveBreachMessage")
        handle_message_errors(e)
    return ob_msg


# message to core
def msg_to_core_variable(msg: VariableMessage) -> Variable:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["date"] = datetime.fromtimestamp(data_snake["date"], timezone.utc).date()
    try:
        variable = Variable(**data_snake)
    except Exception as e:
        log_info("Failed to convert VariableMessage to Variable")
        handle_create_core_object_error(e)
    return variable


def msg_to_core_objective_breach(
    msg: BreachMessage,
) -> Breach:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["variables"] = [msg_to_core_variable(v) for v in msg.variables]
    data_snake["objective_category"] = ObjectiveCategory(
        data_snake["objective_category"]
    )

    try:
        breach = Breach(**data_snake)
    except Exception as e:
        log_info("Failed to convert ObjectiveBreachMessage to ObjectiveBreach")
        handle_create_core_object_error(e)
    return breach
