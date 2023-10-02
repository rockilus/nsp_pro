from mongoengine import Document
from mongoengine.fields import StringField


class Shift(Document):
    meta = {"collection": "shifts"}

    id = StringField(primary_key=True, required=True)
    name = StringField()
