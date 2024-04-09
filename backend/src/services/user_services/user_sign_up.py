from core import User
from integrations.authorization import authz_user_sync
from scripts.setup_database import user_db


async def create_user(user: User) -> User:
    new_user = user_db.create_user(user)
    await authz_user_sync(new_user)
    return new_user
