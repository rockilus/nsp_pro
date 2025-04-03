import time as time_module
from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import Breach, ObjectiveCategory, Variable
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections
from src.errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import BreachMessage, VariableMessage

router = APIRouter()


@router.get("/breaches/teams/{team_id}")
async def get_objective_breaches(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[BreachMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-objective-breaches", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get objective breaches",
            )
        start_time = time_module.time()
        schedule_campaign = db_collections.schedule_db.get_schedule_campaign(team_id)
        if not schedule_campaign:
            return []
        objective_breaches = db_collections.breach_db.get_breaches_by_schedule_id(
            schedule_campaign.id
        )
        response = [core_to_msg_breach(a) for a in objective_breaches]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get breaches: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get objective breaches")
        handle_routes_errors(e)
    return response


@router.put("/breaches/{objective_breach_id}/teams/{team_id}")
async def update_objective_breach(
    team_id: str,
    objective_breach_api: BreachMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> BreachMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-objective-breach", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update objective breaches",
            )
        objective_breach_data = msg_to_core_breach(objective_breach_api)
        updated_objective_breach = db_collections.breach_db.update_breach(
            objective_breach_data
        )
        response = core_to_msg_breach(updated_objective_breach)
    except Exception as e:
        log_info("Failed to update objective breach")
        handle_routes_errors(e)
    return response


@router.delete("/breaches/{objective_breach_id}/teams/{team_id}")
async def delete_objective_breach(
    objective_breach_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-objective-breach", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete objective breaches",
            )
        db_collections.breach_db.delete_breach(objective_breach_id)
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


def core_to_msg_breach(breach: Breach) -> BreachMessage:
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
        handle_create_schema_object_error(e)
    return variable


def msg_to_core_breach(msg: BreachMessage) -> Breach:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["variables"] = [msg_to_core_variable(v) for v in msg.variables]
    data_snake["objective_category"] = ObjectiveCategory(
        data_snake["objective_category"]
    )

    try:
        breach = Breach(**data_snake)
    except Exception as e:
        log_info("Failed to convert ObjectiveBreachMessage to ObjectiveBreach")
        handle_create_schema_object_error(e)
    return breach
