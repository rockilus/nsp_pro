import os
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file


def convert_collections(
    mongo_uri: str, db_name: str, collections_to_convert: dict
):
    client = MongoClient(mongo_uri)
    db = client[db_name]

    for collection_name, fields_to_convert in collections_to_convert.items():
        old_collection = db[collection_name]
        documents = list(old_collection.find())  # Perform the find call once
        if all(
            isinstance(doc["_id"], ObjectId)
            and all(
                isinstance(doc[field], ObjectId)
                or (
                    isinstance(doc[field], list)
                    and all(isinstance(item, ObjectId) for item in doc[field])
                )
                for field in fields_to_convert
                if field in doc
            )
            for doc in documents
        ):
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

            new_doc = doc.copy()
            try:
                new_doc["_id"] = ObjectId(new_doc["_id"])
            except Exception:
                print(
                    f"Warning: Could not convert field '{field}' in document {doc['_id']} to ObjectId"
                )

            for field in fields_to_convert:
                if field in new_doc:
                    if isinstance(new_doc[field], str):
                        try:
                            new_doc[field] = ObjectId(new_doc[field])
                        except Exception:
                            print(
                                f"Warning: Could not convert field '{field}' in document {doc['_id']} to ObjectId"
                            )
                    elif isinstance(new_doc[field], list):
                        try:
                            new_doc[field] = [
                                (
                                    ObjectId(item)
                                    if isinstance(item, str)
                                    else item
                                )
                                for item in new_doc[field]
                            ]
                        except Exception:
                            print(
                                f"Warning: Could not convert list field '{field}' in document {doc['_id']} to ObjectId"
                            )

            new_documents.append(new_doc)

        # Insert new documents into the new collection
        if new_documents:
            new_collection.insert_many(new_documents)
            print(
                f"Inserted {len(new_documents)} documents into {new_collection_name}"
            )

        # Check that all documents from the old collection are in the new one
        new_collection_count = new_collection.count_documents({})
        old_collection_count = old_collection.count_documents({})
        if new_collection_count == old_collection_count:
            # Replace old collection with new one
            if new_collection_name in db.list_collection_names():
                db[collection_name].drop()
                db[new_collection_name].rename(collection_name)
                print(f"Replaced {collection_name} with {new_collection_name}")
        else:
            print(
                f"Error: Document count mismatch between {collection_name} ({old_collection_count}) and {new_collection_name} ({new_collection_count})"
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
            "fields": ["owner", "dimension"],
            "embedded": {},
        },
        "breaches": {
            "fields": ["schedule", "objective_id"],
            "embedded": {
                "variables": {"fields": ["worker", "shift"]},
            },
        },
        "contraint_builds": {
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
        "dimensions": {
            "fields": ["team"],
            "embedded": {},
        },
        "dimension_entries": {
            "fields": ["dimension"],
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
            "fields": ["team_id"],
            "embedded": {},
        },
        "stats_headers": {
            "fields": ["team"],
            "embedded": {
                "selected_shifts": {"fields": ["id"], "embedded": {}}
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
