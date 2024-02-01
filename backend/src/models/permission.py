from mongoengine import Document
from mongoengine.fields import StringField


class Permission(Document):
    meta = {"collection": "permissions"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    description = StringField()


# Example permissions:
# create_user = Permission(name="create_user", description="Create new users")
# read_data = Permission(name="read_data", description="Access and read data")
# update_post = Permission(
#     name="update_post", description="Edit and modify posts"
# )

# Example roles:
# admin_role = Role(
#     name="Admin", permissions=[create_user, read_data, update_post]
# )
# editor_role = Role(name="Editor", permissions=[read_data, update_post])
