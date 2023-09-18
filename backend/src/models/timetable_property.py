from mongoengine import Document
from mongoengine.fields import IntField, ObjectIdField, ReferenceField


class TimetableProperty(Document):
    meta = {"collection": "timetable_properties"}
    _id = ObjectIdField(primary_key=True)
    value = IntField(required=True)
    timetable = ReferenceField("Timetable")
    timetable_time = ReferenceField("TimetableTime")
    timetable_category = ReferenceField("TimetableCategory")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "value": self.value,
            "timetable": str(self.timetable["_id"]),
            "timetable_time": str(self.timetable_time["_id"]),
            "timetable_category": str(self.timetable_category["_id"]),
        }
