from mongoengine import Document
from mongoengine.fields import (
    ListField,
    ObjectIdField,
    StringField,
)


class WorkerParam(Document):
    meta = {"collection": "worker_params"}
    _id = ObjectIdField(primary_key=True)
    name = StringField(required=True)
    label = StringField(required=True)
    entry_type = StringField(required=True)
    entry_options = ListField(StringField())

    def to_dict(self):
        print("self.name:", self.name)
        return {
            "_id": str(self._id),
            "name": self.name,
            "label": self.label,
            "entry_type": self.entry_type,
            "entry_options": self.entry_options,
        }


# class WorkerParams(Document):
#     meta = {"collection": "worker_params"}
#     _id = ObjectIdField(primary_key=True)
#     # parameters = ListField(EmbeddedDocumentField(WorkerParam))
#     parameters = ListField(ReferenceField("WorkerParam"))

#     def to_dict(self):
#         return {
#             "_id": str(self._id),
#             "parameters": [item.to_dict() for item in self.parameters],
#         }

# def __init__(self, *args, **kwargs):
#     super().__init__(*args, **kwargs)
#     self.parameters = [
#         WorkerParam(
#             name="first_name",
#             label="First Name",
#             entry_type="text",
#             entry_options=[],
#         ),
#         WorkerParam(
#             name="last_name",
#             label="Last Name",
#             entry_type="text",
#             entry_options=[],
#         ),
#     ]
