import os

os.environ["DATABASE_URL"] = "sqlite://"  # in-memory DB, set before the app is imported

import pytest
from fastapi.testclient import TestClient

from backend.db.models import Base, engine
from backend.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:  # runs lifespan -> init_db()
        yield c
