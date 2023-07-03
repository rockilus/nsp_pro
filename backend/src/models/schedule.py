from mongoengine import Document
from mongoengine.fields import (
    ListField,
    ObjectIdField,
    ReferenceField,
    DateTimeField,
    BooleanField,
    StringField,
)


class Schedule(Document):
    _id = ObjectIdField(primary_key=True)
    name = StringField(required=True, default="Schedule")
    schedule_list = ListField(required=True)
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)
    build_date = DateTimeField(required=True)
    author = ReferenceField("User")
    hospital = ReferenceField("Hospital")
    users = ListField(ReferenceField("User"))
    shift_labels = ListField(required=True)
    user_labels = ListField(required=True)
    override = ListField(ReferenceField("Schedule"), default=[])
    active = BooleanField(required=True, default=True)

    meta = {"collection": "schedules"}

    def to_dict(self):
        return {
            "_id": str(self._id),
            "name": self.name,
            "schedule_list": self.schedule_list,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "build_date": self.build_date.isoformat(),
            "author": str(self.author["_id"]),
            "hospital": str(self.hospital["_id"]),
            "users": [str(user["_id"]) for user in self.users],
            "shift_labels": self.shift_labels,
            "user_labels": self.user_labels,
            "override": [str(schedule["_id"]) for schedule in self.override],
            "active": self.active,
        }
