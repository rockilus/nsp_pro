from mongoengine import Document
from mongoengine.fields import ObjectIdField, StringField


class Timetable(Document):
    meta = {"collection": "timetables"}
    _id = ObjectIdField(primary_key=True)
    label = StringField(default="Timetable Name")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "label": self.label,
        }
