from typing import Any, Dict, List

from bson import ObjectId
from database.db import DB
from models import Hospital, User

from exceptions import NoKeyProvidedError


# pylint: disable=too-few-public-methods
class HospitalDB:
    def __init__(self, db: DB):
        self.db = db

    def create_hospital(self, name: str, admin: User) -> Hospital:
        # pylint: disable=protected-access
        hospital = Hospital(
            _id=ObjectId(),
            name=name,
            admin=[admin._id],
        )
        hospital_saved = hospital.save()
        return hospital_saved

    def get_hospital_by_id(self, hospital_id: str) -> Hospital:
        # pylint: disable=no-member
        hospital = Hospital.objects.get(_id=hospital_id)  # type: ignore
        return hospital

    def add_profile_option(
        self, dict_path: List, option: str, hospital: Hospital
    ) -> Hospital:
        profile_updated = set_value_from_keys(
            dict_path, option, hospital.profile
        )
        hospital.profile = profile_updated
        hospital = self.update_profile_validation(hospital)
        hospital_saved = hospital.save()
        return hospital_saved

    def delete_profile_option(
        self, dict_path: List, hospital: Hospital
    ) -> Hospital:
        profile_updated = delete_value_from_keys(dict_path, hospital.profile)
        hospital.profile = profile_updated
        hospital = self.update_profile_validation(hospital)
        hospital_saved = hospital.save()
        return hospital_saved

    def update_profile_validation(self, hospital: Hospital) -> Hospital:
        profile_validation_dict = extractLists(hospital.profile)
        hospital.profile_validation = profile_validation_dict
        # hospital_saved = hospital.save()
        return hospital

    def save_parameter(
        self, parameter: str, value: str, hospital: Hospital
    ) -> Hospital:
        setattr(hospital.parameters, parameter, value)
        hospital_saved = hospital.save()
        return hospital_saved


def set_value_from_keys(
    keys: List[str], value: str, dict_: Dict[str, Any]
) -> Dict[str, Any]:
    if len(keys) == 0:
        dict_[value] = {}
        return dict_

    key = keys[0]

    if len(keys) == 1:
        if isinstance(dict_, (str, int)):
            dict_ = {dict_: value}
            return dict_

        if key not in dict_.keys():
            raise KeyError(f"Key {key} not found")
        key_value = dict_.get(key)
        if isinstance(key_value, dict):
            if len(key_value) != 0:
                dict_[key][value] = {}
            else:
                dict_[key] = value
        elif isinstance(key_value, list):
            dict_[key].append(value)
        elif isinstance(key_value, (str, int)):
            dict_[key] = [key_value, value]
        return dict_

    if key not in dict_.keys():
        raise KeyError(f"Key {key} not found")

    dict_[key] = set_value_from_keys(keys[1:], value, dict_[key])

    return dict_


def delete_value_from_keys(
    keys: List[str], dict_: Dict[str, Any]
) -> Dict[str, Any]:
    if len(keys) == 0:
        raise NoKeyProvidedError("No keys provided")

    key = keys[0]

    if key not in dict_.keys():
        raise KeyError(f"Key {key} not found")

    if len(keys) == 1:
        del dict_[key]
        return dict_

    if len(keys) == 2:
        key_value = dict_.get(key)
        if isinstance(key_value, dict):
            del dict_[key][keys[1]]
            # dict_[key][keys[1]] = {}
        if isinstance(key_value, list):
            dict_[key].remove(keys[1])
            if len(dict_[key]) == 1:
                dict_[key] = dict_[key][0]
            if len(dict_[key]) == 0:
                dict_[key] = {}
        if isinstance(key_value, (str, int)):
            dict_[key] = {}

        return dict_

    dict_[key] = delete_value_from_keys(keys[1:], dict_[key])

    if len(keys) >= 2:
        sub_key_value = dict_[key][keys[1]]
        if isinstance(sub_key_value, dict) and len(sub_key_value) == 0:
            dict_[key] = keys[1]

    return dict_


def extractLists(obj: Dict[str, Any]) -> Dict[str, Any]:
    result = {}
    for key, value in obj.items():
        if isinstance(value, list):
            result[key] = value
        elif isinstance(value, dict):
            sub_dict = extractLists(value)
            result.update(sub_dict)
    return result
