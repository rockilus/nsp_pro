from typing import List

from bson import ObjectId

from core.team import Team
from database.db import DB
from models import Team as TeamDocument
from models import User as UserDocument


class TeamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_team(self, team: Team) -> Team:
        team_d = TeamDocument(
            id=str(ObjectId()),
            team_members=team.team_members,
            team_leaders=team.team_leaders,
        )
        team_saved = team_d.save()
        return _from_mongo_team(team_saved)

    def get_teams(
        self,
    ) -> List[Team]:
        # pylint: disable=no-member
        teams = TeamDocument.objects.all()  # type: ignore
        return [_from_mongo_team(t) for t in list(teams)]

    def get_team_by_id(self, team_id: str) -> Team:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=team_id)  # type: ignore
        return _from_mongo_team(team)

    def update_team(self, team: Team) -> Team:
        # pylint: disable=no-member
        team_document = TeamDocument.objects.get(id=team.id)  # type: ignore
        team_document.save()
        return _from_mongo_team(team_document)

    def delete_team(self, team_id: str) -> None:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=team_id)  # type: ignore
        team.delete()


# Mappers
def to_mongo_team(dataclass_obj: Team) -> TeamDocument:
    # pylint: disable=no-member
    team_members = (
        UserDocument.objects.filter(id__in=dataclass_obj.team_members)  # type: ignore
        if dataclass_obj.team_members
        else []
    )
    team_leaders = (
        UserDocument.objects.filter(id__in=dataclass_obj.team_leaders)  # type: ignore
        if dataclass_obj.team_leaders
        else []
    )
    return TeamDocument(
        id=dataclass_obj.id,
        team_members=team_members,
        team_leaders=team_leaders,
    )


def _from_mongo_team(doc_obj: TeamDocument) -> Team:
    return Team(
        id=doc_obj.id,
        team_members=[str(u.id) for u in doc_obj.team_members],
        team_leaders=[str(u.id) for u in doc_obj.team_leaders],
    )
