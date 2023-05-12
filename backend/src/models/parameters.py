from mongoengine import Document
from mongoengine.fields import IntField, ReferenceField, ObjectIdField

from models.hospital import Hospital


class Parameters(Document):
    _id = ObjectIdField(primary_key=True)
    nb_weeks = IntField(required=True, default=1)
    nb_shifts_day = IntField(required=True, default=1)
    hospital = ReferenceField(Hospital, required=True)

    # nb_days_week = IntField(required=True)
    # nb_days_workweek = IntField(required=True)
    # nb_days_weekend = IntField(required=True)

    meta = {
        "collection": "parameters",
        "indexes": [{"fields": ["hospital"], "unique": True}],
    }

    def to_dict(self):
        return {
            "_id": str(self._id),
            "nb_weeks": self.nb_weeks,
            "nb_shifts_day": self.nb_shifts_day,
            "hospital": str(self.hospital["_id"]),
        }
