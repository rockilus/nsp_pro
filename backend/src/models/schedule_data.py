from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    IntField,
    ObjectIdField,
    ReferenceField,
    StringField,
)


class ScheduleData(Document):
    _id = ObjectIdField(primary_key=True)
    date = DateTimeField(required=True)
    shift_type = IntField(required=True)
    shift_type_label = StringField(required=True)
    user_last_name = StringField(required=True)
    schedule_main = BooleanField(required=True, default=False)
    schedule = ReferenceField("Schedule")
    hospital = ReferenceField("Hospital")
    user = ReferenceField("User")

    meta = {"collection": "schedule_data"}

    def to_dict(self):
        # if isinstance(self.user, User):
        #     user_dict = self.user.to_dict()
        # else:
        #     user_dict = str(self.user["_id"])
        return {
            "_id": str(self._id),
            "date": self.date.isoformat(),
            "shift_type": self.shift_type,
            "shift_type_label": self.shift_type_label,
            "user_last_name": self.user_last_name,
            "schedule": str(self.schedule["_id"]),
            "hospital": str(self.hospital["_id"]),
            "user": str(self.user["_id"]),
        }
