from mongoengine import Document
from mongoengine.fields import ListField, StringField


class WorkerDimension(Document):
    meta = {"collection": "worker_dimensions"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    label = StringField(required=True)
    entry_type = StringField(required=True)
    entry_options = ListField(StringField())
