from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.errors.document_errors import DocumentDoesNotExistError
from shared.database.models.config import Config as ConfigDocument
from shared.logger.logger import log_info
from shared.schemas.schemas.config import Config


class ConfigDB:
    def __init__(self, db: DB):
        self.db = db

    def create_config(self, config: Config) -> Config:
        config_doc = core_to_doc_config(config)
        config_doc.id = str(ObjectId())
        try:
            config_saved = config_doc.save()
        except Exception as e:
            log_info("Failed to save config to database")
            handle_save_document_error(e)
        return doc_to_core_config(config_saved)

    def get_config(self) -> Config | None:
        try:
            # pylint: disable=no-member
            config = ConfigDocument.objects.first()  # type: ignore
            if config is None:
                return None
        except Exception as e:
            log_info("Failed to get config from database")
            handle_get_document_error(e)
        return doc_to_core_config(config)

    def update_config(self, config: Config) -> Config:
        config_doc = core_to_doc_config(config)
        try:
            config_saved = config_doc.save()
        except Exception as e:
            log_info("Failed to save config to database")
            handle_save_document_error(e)
        return doc_to_core_config(config_saved)

    # pylint: disable=R0801
    def add_signup_email_attempt(self, email: str) -> Config:
        config = self.get_config()
        if config is None:
            raise DocumentDoesNotExistError("Config not found in database")
        config.signup_emails_attempt.append(email)
        return self.update_config(config)


# Mappers
# core to document
# pylint: disable=R0801
def core_to_doc_config(dataclass_obj: Config) -> ConfigDocument:
    try:
        t_doc = ConfigDocument(
            id=dataclass_obj.id,
            signup_emails_whitelist_enabled=(
                dataclass_obj.signup_emails_whitelist_enabled
            ),
            signup_emails_whitelist=dataclass_obj.signup_emails_whitelist,
            signup_emails_attempt=dataclass_obj.signup_emails_attempt,
        )
    except Exception as e:
        log_info("Failed to convert Config to ConfigDocument")
        handle_create_document_error(e)
    return t_doc


# document to core
def doc_to_core_config(doc_obj: ConfigDocument) -> Config:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict.pop("_id")
    doc_dict.pop("singleton_key")
    return Config(**doc_dict)
