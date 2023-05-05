from typing import Union

from database.db import DB
from models import Hospital, User


class UserDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_user(
        self,
        first_name: str,
        last_name: str,
        email: str,
        password: str,
        hospital: Union[Hospital, None] = None,
    ) -> User:
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            hospital=hospital,
            active=True,
        )
        user.password = user.encrypt_password(password)
        user_saved = user.save()
        return user_saved

    def get_user_by_id(self, user_id):
        # pylint: disable=no-member
        user = User.objects.get(id=user_id)
        return user

    def add_hospital_to_user(self, user: User, hospital: Hospital) -> User:
        user.hospital = hospital
        user.save()
        return user

    def get_user_by_email(self, email: str) -> User:
        # pylint: disable=no-member
        user = User.objects.get(email=email)  # type: ignore
        return user
