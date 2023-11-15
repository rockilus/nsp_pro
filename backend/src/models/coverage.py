from mongoengine import Document
from mongoengine.fields import StringField


class Coverage(Document):
    meta = {"collection": "coverages"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
