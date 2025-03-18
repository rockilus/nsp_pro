import os
from typing import List, Dict, Any
from bson import ObjectId
from pymongo import MongoClient, collection
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file


def check_if_already_converted(
    documents: List[Dict[str, Any]], fields_to_convert: Dict[str, Any]
) -> bool:
    def check_fields(doc: Dict[str, Any], fields: Dict[str, Any]) -> bool:
        for field in fields["fields"]:
            if field in doc:
                if isinstance(doc[field], list):
                    if not all(
                        isinstance(item, ObjectId) for item in doc[field]
                    ):
                        return False
                elif not isinstance(doc[field], ObjectId):
                    return False
        if "embedded" in fields:
            for embedded_field, embedded_fields in fields["embedded"].items():
                if embedded_field in doc:
                    if isinstance(doc[embedded_field], list):
                        if not all(
                            check_fields(item, embedded_fields)
                            for item in doc[embedded_field]
                        ):
                            return False
                    elif isinstance(doc[embedded_field], dict):
                        if not check_fields(
                            doc[embedded_field], embedded_fields
                        ):
                            return False
        return True

    return all(check_fields(doc, fields_to_convert) for doc in documents)


def convert_document_to_objectid(
    doc: Dict[str, Any], fields_to_convert: Dict[str, Any]
) -> Dict[str, Any]:
    new_doc = doc.copy()
    try:
        new_doc["_id"] = ObjectId(new_doc["_id"])
    except Exception:
        print(
            f"Warning: Could not convert field '_id' in document {doc['_id']} to ObjectId"
        )

    def convert_fields(doc: Dict[str, Any], fields: Dict[str, Any]) -> None:
        for field in fields["fields"]:
            if field in doc:
                if isinstance(doc[field], str):
                    try:
                        if ObjectId.is_valid(doc[field]):
                            doc[field] = ObjectId(doc[field])
                        else:
                            raise ValueError("Invalid ObjectId")
                    except Exception:
                        print(
                            f"Warning: Could not convert field '{field}' in document {doc} to ObjectId"
                        )
                elif isinstance(doc[field], list):
                    try:
                        doc[field] = [
                            (
                                ObjectId(item)
                                if isinstance(item, str)
                                and ObjectId.is_valid(item)
                                else item
                            )
                            for item in doc[field]
                        ]
                    except Exception:
                        print(
                            f"Warning: Could not convert list field '{field}' in document {doc['_id']} to ObjectId"
                        )
        if "embedded" in fields:
            for embedded_field, embedded_fields in fields["embedded"].items():
                if embedded_field in doc:
                    if isinstance(doc[embedded_field], list):
                        for item in doc[embedded_field]:
                            convert_fields(item, embedded_fields)
                    elif isinstance(doc[embedded_field], dict):
                        convert_fields(doc[embedded_field], embedded_fields)

    convert_fields(new_doc, fields_to_convert)
    return new_doc


def check_document_count(
    old_collection: collection.Collection,
    new_collection: collection.Collection,
) -> bool:
    new_collection_count = new_collection.count_documents({})
    old_collection_count = old_collection.count_documents({})
    return new_collection_count == old_collection_count


def replace_old_collection_with_new(
    db: MongoClient, collection_name: str, new_collection_name: str
) -> None:
    if new_collection_name in db.list_collection_names():
        db[collection_name].drop()
        db[new_collection_name].rename(collection_name)
        print(f"Replaced {collection_name} with {new_collection_name}")


def convert_collections(
    mongo_uri: str,
    db_name: str,
    collections_to_convert: Dict[str, Dict[str, Any]],
) -> None:
    client = MongoClient(mongo_uri)
    db = client[db_name]

    for collection_name, fields_to_convert in collections_to_convert.items():
        if collection_name not in db.list_collection_names():
            print(f"Collection {collection_name} does not exist.")
            continue

        old_collection = db[collection_name]
        documents = list(old_collection.find())  # Perform the find call once
        if check_if_already_converted(documents, fields_to_convert):
            print(
                f"Collection {collection_name} already contains ObjectId fields."
            )
            continue

        new_collection_name = f"{collection_name}_objectid"
        new_collection = db[new_collection_name]
        documents_new_collection = new_collection.find()
        document_ids_new_collection = [
            doc["_id"] for doc in documents_new_collection
        ]

        # Convert documents
        new_documents = []
        for doc in documents:
            if ObjectId(doc["_id"]) in document_ids_new_collection:
                print(
                    f"Document {doc['_id']} already exists in {new_collection_name}"
                )
                continue

            new_doc = convert_document_to_objectid(doc, fields_to_convert)
            new_documents.append(new_doc)

        # Insert new documents into the new collection
        if new_documents:
            new_collection.insert_many(new_documents)
            print(
                f"Inserted {len(new_documents)} documents into {new_collection_name}"
            )

        # Check that all documents from the old collection are in the new one
        if check_document_count(old_collection, new_collection):
            # Replace old collection with new one
            replace_old_collection_with_new(
                db, collection_name, new_collection_name
            )
        else:
            print(
                f"Error: Document count mismatch between {collection_name} and {new_collection_name}"
            )

    print("Migration completed.")


# Example usage
if __name__ == "__main__":
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "mydatabase")
    TARGET_COLLECTIONS = {
        "assignments": {
            "fields": ["team", "schedule", "worker", "shift"],
            "embedded": {},
        },
        "attributes": {
            "fields": ["owner", "dimension", "dim_entries"],
            "embedded": {},
        },
        "breaches": {
            "fields": ["schedule", "objective_id"],
            "embedded": {
                "variables": {"fields": ["worker", "shift"]},
            },
        },
        "constraint_builds": {
            "fields": ["team"],
            "embedded": {
                "blocks": {
                    "fields": [],
                    "embedded": {
                        "value": {
                            "fields": ["id"]
                        }  # add condition for type SWO
                    },
                }
            },
        },
        "coverage_selectors": {
            "fields": ["schedule", "coverage"],
            "embedded": {},
        },
        "coverages": {
            "fields": ["team"],
            "embedded": {},
        },
        "daily_shift_demands": {
            "fields": ["team", "schedule", "shift_demand", "shift"],
            "embedded": {},
        },
        "dim_entries": {
            "fields": ["dimension"],
            "embedded": {},
        },
        "dimensions": {
            "fields": ["team"],
            "embedded": {},
        },
        "link_shifts": {
            "fields": ["team", "shifts"],
            "embedded": {},
        },
        "model_outputs": {
            "fields": ["schedule"],
            "embedded": {},
        },
        "requests": {
            "fields": ["team", "worker", "shift"],
            "embedded": {},
        },
        "schedules": {
            "fields": ["team", "constraint_build_ids"],
            "embedded": {
                "quick_staffings": {
                    "fields": ["worker_id", "shift_id"],
                    "embedded": {},
                },
            },
        },
        "shift_demands": {
            "fields": ["shift", "coverage"],
            "embedded": {},
        },
        "shifts": {
            "fields": ["team", "recuperation_duty"],
            "embedded": {
                "staffing": {"fields": ["specialty"], "embedded": {}}
            },
        },
        "specialties": {
            "fields": ["team"],
            "embedded": {},
        },
        "stats_headers": {
            "fields": ["team"],
            "embedded": {
                # "selected_shifts": {"fields": ["id"], "embedded": {}}
            },
        },
        "teams": {
            "fields": ["team_members", "team_leaders"],
            "embedded": {},
        },
        "users": {
            "fields": ["workers", "impersonating_user"],
            "embedded": {},
        },
        "workers": {
            "fields": ["team", "specialties"],
            "embedded": {},
        },
    }

    convert_collections(MONGO_URI, DB_NAME, TARGET_COLLECTIONS)
