from mongoengine import Document
from mongoengine.fields import DynamicField, ReferenceField, StringField


class WorkerProperty(Document):
    meta = {"collection": "worker_properties"}

    id = StringField(primary_key=True, required=True)
    value = DynamicField()
    worker = ReferenceField("Worker")
    worker_dimension = ReferenceField("WorkerDimension")
