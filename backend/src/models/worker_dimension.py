from mongoengine import Document
from mongoengine.fields import ListField, StringField


class WorkerDimension(Document):
    meta = {"collection": "worker_dimensions"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    entry_type = StringField(required=True, choices=["str", "int", "bool", "list"])
    entry_options = ListField(StringField())
