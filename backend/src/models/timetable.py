from mongoengine import Document
from mongoengine.fields import ObjectIdField


class Timetable(Document):
    meta = {"collection": "timetables"}
    _id = ObjectIdField(primary_key=True)

    def to_dict(self):
        return {
            "_id": str(self._id),
        }
