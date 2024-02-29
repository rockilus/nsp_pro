from mongoengine import Document
from mongoengine.fields import ReferenceField, StringField


class Coverage(Document):
    meta = {"collection": "coverages"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
