from typing import List

from bson import ObjectId
from database.db import DB
from database.errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from database.models import Team as TeamDocument
from database.models import User as UserDocument
from logger import log_info
from schemas import Team
from schemas.errors import handle_create_schema_object_error


class TeamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_team(self, team: Team) -> Team:
        team_doc = core_to_doc_team(team)
        team_doc.id = str(ObjectId())
        try:
            team_saved = team_doc.save()
        except Exception as e:
            log_info("Failed to save team to database")
            handle_save_document_error(e)
        return doc_to_core_team(team_saved)

    def get_teams(self) -> List[Team]:
        try:
            # pylint: disable=no-member
            teams = TeamDocument.objects.all()  # type: ignore
        except Exception as e:
            log_info("Failed to get teams from database")
            handle_get_document_error(e)
        return [doc_to_core_team(t) for t in list(teams)]

    def get_team_by_id(self, team_id: str) -> Team:
        try:
            # pylint: disable=no-member
            team = TeamDocument.objects.get(id=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get team by id from database")
            handle_get_document_error(e)
        return doc_to_core_team(team)

    def get_teams_by_ids(self, team_ids: List[str]) -> List[Team]:
        try:
            # pylint: disable=no-member
            t_docs = TeamDocument.objects.filter(id__in=team_ids)  # type: ignore
        except Exception as e:
            log_info("Failed to get teams by ids from database")
            handle_get_document_error(e)
        try:
            teams = [doc_to_core_team(team) for team in t_docs]
        except Exception as e:
            log_info("Failed to convert TeamDocument to Team")
            handle_create_schema_object_error(e)
        return teams

    def get_teams_by_leader_id(self, leader_id: str) -> List[Team]:
        try:
            # pylint: disable=no-member
            t_docs = TeamDocument.objects.filter(  # type: ignore
                team_leaders__contains=leader_id
            )
        except Exception as e:
            log_info("Failed to get teams by leader ids from database")
            handle_get_document_error(e)
        try:
            teams = [doc_to_core_team(team) for team in t_docs]
        except Exception as e:
            log_info("Failed to convert TeamDocument to Team")
            handle_create_schema_object_error(e)
        return teams

    def update_team(self, team: Team) -> Team:
        t_doc = core_to_doc_team(team)
        try:
            # pylint: disable=no-member
            TeamDocument.objects.get(id=team.id)  # type: ignore
        except Exception as e:
            log_info(f"Team with id {t_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            t_saved = t_doc.save()
        except Exception as e:
            log_info("Failed to update team to database")
            handle_save_document_error(e)
        return doc_to_core_team(t_saved)

    def delete_team(self, team_id: str) -> None:
        try:
            # pylint: disable=no-member
            team = TeamDocument.objects.get(id=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get team by id to delete from database")
            handle_get_document_error(e)
        try:
            team.delete()
        except Exception as e:
            log_info("Failed to delete team from database")
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
        log_info("Failed to get users by ids from database")
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
        log_info("Failed to get users by ids from database")
        handle_get_document_error(e)
    try:
        t_doc = TeamDocument(
            id=dataclass_obj.id,
            team_members=team_members,
            team_leaders=team_leaders,
        )
    except Exception as e:
        log_info("Failed to convert Team to TeamDocument")
        handle_create_document_error(e)
    return t_doc


# document to core
def doc_to_core_team(doc_obj: TeamDocument) -> Team:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict.pop("_id")
    return Team(**doc_dict)
