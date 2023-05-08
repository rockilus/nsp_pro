from typing import Union

from bson import ObjectId
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
            _id=ObjectId(),
            first_name=first_name,
            last_name=last_name,
            email=email,
            hospital=hospital,
            active=True,
        )
        user.password = user.encrypt_password(password)
        user_saved = user.save()
        return user_saved

    def get_user_by_id(self, user_id: str) -> User:
        # pylint: disable=no-member
        print("user_id in get_user_by_id:", user_id)
        user = User.objects.get(_id=user_id)  # type: ignore
        return user

    def add_hospital_to_user(self, user: User, hospital: Hospital) -> User:
        user.hospital = hospital
        user.save()
        return user

    def get_user_by_email(self, email: str) -> User:
        # pylint: disable=no-member
        user = User.objects.get(email=email)  # type: ignore
        return user
