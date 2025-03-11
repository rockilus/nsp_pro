import os

import pytest


@pytest.fixture(autouse=True, scope="session")
def set_test_mode():
    os.environ["TEST_MODE"] = "1"
    yield
    if "TEST_MODE" in os.environ:
        del os.environ["TEST_MODE"]
