from mongoengine import Document
from mongoengine.fields import ReferenceField, StringField


class LinkShift(Document):
    meta = {"collection": "link_shifts"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    shifts = ReferenceField("Shift", required=True)
