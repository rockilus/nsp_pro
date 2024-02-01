from mongoengine import Document
from mongoengine.fields import EmailField, ListField, ReferenceField, StringField


class User(Document):
    meta = {"collection": "users"}

    id = StringField(primary_key=True, required=True)
    username = EmailField(required=True, unique=True)
    hashed_password = StringField(required=True)
    first_name = StringField(required=True)
    last_name = StringField(required=True)
    roles = ListField(ReferenceField("Role"))
