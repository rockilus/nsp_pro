from core.team import Team
from core.user import User
from scripts.setup_database import team_db, user_db


def user_sign_up(user_id: str, email: str) -> str:
    user_db.create_user(
        User(id=user_id, email=email, first_name="", last_name="", workers=[])
    )
    team = team_db.create_team(
        Team(id="", team_members=[user_id], team_leaders=[user_id])
    )
    return str(team.id)
