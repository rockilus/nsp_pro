"""
Example: Connecting to AWS DocumentDB from Python

This example shows how to connect to DocumentDB using the credentials
stored in AWS Secrets Manager.

Requirements:
- boto3
- pymongo
- global-bundle.pem certificate file

Usage:
    python documentdb_example.py
"""

import boto3
import json
import pymongo
import ssl
from typing import Dict, Any


class DocumentDBClient:
    def __init__(self, secret_name: str, region_name: str = "us-east-1"):
        """
        Initialize DocumentDB client with credentials from Secrets Manager

        Args:
            secret_name: Name of the secret containing DocumentDB credentials
            region_name: AWS region where the secret is stored
        """
        self.secret_name = secret_name
        self.region_name = region_name
        self.client = None
        self.db = None

    def _get_credentials(self) -> Dict[str, Any]:
        """Retrieve DocumentDB credentials from AWS Secrets Manager"""
        secrets_client = boto3.client(
            "secretsmanager", region_name=self.region_name
        )

        try:
            secret_value = secrets_client.get_secret_value(
                SecretId=self.secret_name
            )
            return json.loads(secret_value["SecretString"])
        except Exception as e:
            raise Exception(f"Failed to retrieve credentials: {str(e)}")

    def connect(self, database_name: str = "nsp_pro") -> None:
        """
        Connect to DocumentDB cluster

        Args:
            database_name: Name of the database to connect to
        """
        credentials = self._get_credentials()

        # Build connection URI
        connection_uri = (
            f"mongodb://{credentials['username']}:{credentials['password']}"
            f"@{credentials['host']}:{credentials['port']}"
            f"/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0"
            f"&readPreference=secondaryPreferred&retryWrites=false"
        )

        try:
            # Create MongoDB client with TLS configuration
            self.client = pymongo.MongoClient(
                connection_uri,
                ssl=True,
                ssl_ca_certs="global-bundle.pem",
                ssl_cert_reqs=ssl.CERT_REQUIRED,
                ssl_match_hostname=False,
            )

            # Connect to database
            self.db = self.client[database_name]

            # Test connection
            self.client.admin.command("ping")
            print(
                f"Successfully connected to DocumentDB database: {database_name}"
            )

        except Exception as e:
            raise Exception(f"Failed to connect to DocumentDB: {str(e)}")

    def get_database(self):
        """Get the database object"""
        if self.db is None:
            raise Exception("Not connected to database. Call connect() first.")
        return self.db

    def close(self) -> None:
        """Close the database connection"""
        if self.client:
            self.client.close()
            print("DocumentDB connection closed")


def example_usage():
    """Example usage of DocumentDB client"""

    # Initialize client
    docdb = DocumentDBClient(
        secret_name="nsp-pro/prod/documentdb/credentials",
        region_name="us-east-1",
    )

    try:
        # Connect to database
        docdb.connect(database_name="nsp_pro")

        # Get database reference
        db = docdb.get_database()

        # Example: Insert a document
        collection = db.schedules
        document = {
            "schedule_id": "example_001",
            "facility_id": "facility_123",
            "shifts": [
                {
                    "shift_id": "shift_001",
                    "start_time": "2024-01-01T08:00:00Z",
                    "end_time": "2024-01-01T16:00:00Z",
                    "role": "nurse",
                    "department": "emergency",
                }
            ],
            "created_at": "2024-01-01T00:00:00Z",
            "status": "active",
        }

        result = collection.insert_one(document)
        print(f"Inserted document with ID: {result.inserted_id}")

        # Example: Query documents
        schedules = collection.find({"facility_id": "facility_123"})
        print(
            f"Found {collection.count_documents({'facility_id': 'facility_123'})} schedules"
        )

        for schedule in schedules:
            print(f"Schedule ID: {schedule['schedule_id']}")
            print(f"Number of shifts: {len(schedule['shifts'])}")

        # Example: Update a document
        update_result = collection.update_one(
            {"schedule_id": "example_001"}, {"$set": {"status": "completed"}}
        )
        print(f"Updated {update_result.modified_count} document(s)")

        # Example: Delete a document
        delete_result = collection.delete_one({"schedule_id": "example_001"})
        print(f"Deleted {delete_result.deleted_count} document(s)")

    except Exception as e:
        print(f"Error: {e}")

    finally:
        # Always close the connection
        docdb.close()


if __name__ == "__main__":
    # Make sure global-bundle.pem is in the same directory
    import os

    if not os.path.exists("global-bundle.pem"):
        print("Error: global-bundle.pem not found!")
        print(
            "Please run the download-cert.sh script first or download it manually:"
        )
        print(
            "wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
        )
        exit(1)

    example_usage()
