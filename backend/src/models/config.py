from mongoengine import Document
from mongoengine.fields import BooleanField, ListField, StringField


class Config(Document):
    meta = {"collection": "config"}

    id = StringField(primary_key=True, required=True)
    signup_emails_whitelist_enabled = BooleanField(default=True)
    signup_emails_whitelist = ListField(StringField())
    signup_emails_attempt = ListField(StringField())
    singleton_key = StringField(default="singleton", unique=True)
