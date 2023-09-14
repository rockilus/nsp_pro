from mongoengine import Document
from mongoengine.fields import ObjectIdField, ReferenceField, StringField


class TimetableTime(Document):
    meta = {"collection": "timetable_times"}
    _id = ObjectIdField(primary_key=True)
    label = StringField(required=True)
    timetable = ReferenceField("Timetable")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "label": self.label,
            "timetable": str(self.timetable["_id"]),
        }
