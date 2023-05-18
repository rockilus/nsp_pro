from mongoengine import Document
from mongoengine.fields import (
    ListField,
    ObjectIdField,
    ReferenceField,
    DateTimeField,
)


class Schedule(Document):
    _id = ObjectIdField(primary_key=True)
    schedule_list = ListField(required=True)
    start_date = DateTimeField(required=True)
    hospital = ReferenceField("Hospital")
    users = ListField(ReferenceField("User"))
    shift_labels = ListField(required=True)
    user_labels = ListField(required=True)

    meta = {"collection": "schedules"}

    def to_dict(self):
        return {
            "_id": str(self._id),
            "schedule_list": self.schedule_list,
            "start_date": self.start_date.isoformat(),
            "hospital": str(self.hospital["_id"]),
            "users": [str(user["_id"]) for user in self.users],
            "shift_labels": self.shift_labels,
            "user_labels": self.user_labels,
        }
