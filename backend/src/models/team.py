from mongoengine import Document
from mongoengine.fields import ListField, ReferenceField, StringField


class Team(Document):
    meta = {"collection": "teams"}

    id = StringField(primary_key=True, required=True)
    team_members = ListField(ReferenceField('User'))
    team_leaders = ListField(ReferenceField('User'))
