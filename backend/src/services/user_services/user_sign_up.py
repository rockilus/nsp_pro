from core.user import User
from scripts.setup_database import user_db
from services.authorization.authz_services import permit_user_sync


async def create_user(user: User) -> User:
    new_user = user_db.create_user(user)
    await permit_user_sync(new_user)
    return new_user
