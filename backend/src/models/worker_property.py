from mongoengine import Document
from mongoengine.fields import (
    DynamicField,
    ObjectIdField,
    ReferenceField,
)


class WorkerProperty(Document):
    meta = {"collection": "worker_properties"}
    _id = ObjectIdField(primary_key=True)
    value = DynamicField()
    worker = ReferenceField("Worker")
    worker_param = ReferenceField("WorkerParam")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "value": self.value,
            "worker": str(self.worker["_id"]),
            "worker_param": str(self.worker_param["_id"]),
        }
