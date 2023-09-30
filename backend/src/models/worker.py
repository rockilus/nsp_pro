from mongoengine import Document
from mongoengine.fields import StringField


class Worker(Document):
    meta = {"collection": "workers"}

    id = StringField(primary_key=True, required=True)
