from typing import List

from bson import ObjectId

from core.team import Team
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import Team as TeamDocument
from models import User as UserDocument
from services.logging import log_info


class TeamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_team(self, team: Team) -> Team:
        team_doc = core_to_doc_team(team)
        team_doc.id = str(ObjectId())
        try:
            team_saved = team_doc.save()
        except Exception as e:
            log_info(f"Failed to save team to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_team(team_saved)

    def get_teams(self) -> List[Team]:
        try:
            # pylint: disable=no-member
            teams = TeamDocument.objects.all()  # type: ignore
        except Exception as e:
            log_info(f"Failed to get teams from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_team(t) for t in list(teams)]

    def get_team_by_id(self, team_id: str) -> Team:
        try:
            # pylint: disable=no-member
            team = TeamDocument.objects.get(id=team_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get team by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_team(team)

    def update_team(self, team: Team) -> Team:
        team_doc = core_to_doc_team(team)
        try:
            team_saved = team_doc.save()
        except Exception as e:
            log_info(f"Failed to update team to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_team(team_saved)

    def delete_team(self, team_id: str) -> None:
        try:
            # pylint: disable=no-member
            team = TeamDocument.objects.get(id=team_id)  # type: ignore
        except Exception as e:
            log_info(f"Failed to get team by id to delete from database: {e}")
            handle_get_document_error(e)
        try:
            team.delete()
        except Exception as e:
            log_info(f"Failed to delete team from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_team(dataclass_obj: Team) -> TeamDocument:
    try:
        # pylint: disable=no-member
        team_members = (
            UserDocument.objects.filter(  # type: ignore
                id__in=dataclass_obj.team_members
            )
            if dataclass_obj.team_members
            else []
        )
    except Exception as e:
        log_info(f"Failed to get users by ids from database: {e}")
        handle_get_document_error(e)
    try:
        # pylint: disable=no-member
        team_leaders = (
            UserDocument.objects.filter(  # type: ignore
                id__in=dataclass_obj.team_leaders
            )
            if dataclass_obj.team_leaders
            else []
        )
    except Exception as e:
        log_info(f"Failed to get users by ids from database: {e}")
        handle_get_document_error(e)
    try:
        t_doc = TeamDocument(
            id=dataclass_obj.id,
            team_members=team_members,
            team_leaders=team_leaders,
        )
    except Exception as e:
        log_info(f"Failed to convert Team to TeamDocument: {e}")
        handle_create_document_error(e)
    return t_doc


# document to core
def doc_to_core_team(doc_obj: TeamDocument) -> Team:
    try:
        team = Team(
            id=doc_obj.id,
            team_members=[str(u.id) for u in doc_obj.team_members],
            team_leaders=[str(u.id) for u in doc_obj.team_leaders],
        )
    except Exception as e:
        log_info(f"Failed to convert TeamDocument to Team: {e}")
        handle_create_core_object_error(e)
    return team
