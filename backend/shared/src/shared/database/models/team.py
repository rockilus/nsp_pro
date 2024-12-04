from mongoengine import Document
from mongoengine.fields import BooleanField, ListField, ReferenceField, StringField


class Specialty(Document):
    meta = {"collection": "specialties"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    deleted = BooleanField(required=True)


class Team(Document):
    meta = {"collection": "teams"}

    id = StringField(primary_key=True, required=True)
    team_members = ListField(ReferenceField("User"))
    team_leaders = ListField(ReferenceField("User"))
