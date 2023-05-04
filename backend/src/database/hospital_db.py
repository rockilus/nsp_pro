from database.db import DB


from models import Hospital, User


# pylint: disable=too-few-public-methods
class HospitalDB:
    def __init__(self, db: DB):
        self.db = db

    def create_hospital(self, name: str, admin: User) -> Hospital:
        hospital = Hospital(
            name=name,
            admin=[admin],
        )
        hospital_saved = hospital.save()
        return hospital_saved


# import mongoengine

# from models import Hospital
# from database.db import DB

# class HospitalDB(DB):
#     def __init__(self, db_uri: str):
#         super().__init__(db_uri)

#     def create(self, name: str, address: str, phone: str, email: str):
#         hospital = Hospital(name=name, address=address, phone=phone,
#  email=email)
#         hospital.save()
#         return hospital

#     def get(self, id: str):
#         return Hospital.objects(id=id).first()

#     def get_all(self):
#         return Hospital.objects

#     def update(self, id: str, name: str, address: str, phone: str,
# email: str):
#         hospital = self.get(id)
#         hospital.name = name
#         hospital.address = address
#         hospital.phone = phone
#         hospital.email = email
#         hospital.save()
#         return hospital

#     def delete(self, id: str):
#         hospital = self.get(id)
#         hospital.delete()
#         return hospital
