import re
from unittest.mock import MagicMock, patch

import pytest
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.database_pymongo.database import MongoDB


@pytest.fixture(scope="module")
def mongo_uri() -> str:
    return "mongodb://localhost:27017"


@pytest.fixture(scope="module")
def db_name() -> str:
    return "test_db"


# pylint: disable=redefined-outer-name
def test_connect_mock(mongo_uri: str, db_name: str) -> None:
    with patch("shared.database_pymongo.database.MongoClient") as MockMongoClient:
        mock_client = MockMongoClient.return_value
        mock_db = MagicMock(spec=Database)
        mock_client.__getitem__.return_value = mock_db

        db: Database = MongoDB.connect(mongo_uri, db_name)
        assert db == mock_db
        MongoDB.close()


def test_get_database_without_connect() -> None:
    with pytest.raises(
        ValueError,
        match=re.escape("No database connection. Call connect() first."),
    ):
        MongoDB.get_database()


# pylint: disable=redefined-outer-name
def test_get_database_mock(mongo_uri: str, db_name: str) -> None:
    with patch("shared.database_pymongo.database.MongoClient") as MockMongoClient:
        mock_client = MockMongoClient.return_value
        mock_db = MagicMock(spec=Database)
        mock_client.__getitem__.return_value = mock_db

        MongoDB.connect(mongo_uri, db_name)
        db: Database = MongoDB.get_database()
        assert db == mock_db
        MongoDB.close()


# pylint: disable=redefined-outer-name
def test_close_mock(mongo_uri: str, db_name: str) -> None:
    with patch("shared.database_pymongo.database.MongoClient") as MockMongoClient:
        mock_client = MockMongoClient.return_value
        mock_db = MagicMock(spec=Database)
        mock_client.__getitem__.return_value = mock_db

        MongoDB.connect(mongo_uri, db_name)
        MongoDB.close()
        with pytest.raises(
            ValueError,
            match=re.escape("No database connection. Call connect() first."),
        ):
            MongoDB.get_database()


def test_invalid_uri_mock() -> None:
    with patch("shared.database_pymongo.database.MongoClient") as MockMongoClient:
        MockMongoClient.side_effect = ConnectionFailure("Failed to connect")
        with pytest.raises(ConnectionFailure):
            MongoDB.connect("mongodb://invalid_uri:27017", "test_db", 100)


# pylint: disable=redefined-outer-name
def test_connect(mongo_uri: str, db_name: str) -> None:
    db: Database = MongoDB.connect(mongo_uri, db_name)
    assert db.name == db_name
    MongoDB.close()


def test_get_database(mongo_uri: str, db_name: str) -> None:
    MongoDB.connect(mongo_uri, db_name)
    db: Database = MongoDB.get_database()
    assert db.name == db_name
    MongoDB.close()


def test_close(mongo_uri: str, db_name: str) -> None:
    MongoDB.connect(mongo_uri, db_name)
    MongoDB.close()
    with pytest.raises(
        ValueError,
        match=re.escape("No database connection. Call connect() first."),
    ):
        MongoDB.get_database()


def test_invalid_uri() -> None:
    with pytest.raises(ConnectionFailure):
        db: Database = MongoDB.connect("mongodb://invalid_uri:27017", "test_db", 100)
        db.list_collection_names()  # type: ignore
