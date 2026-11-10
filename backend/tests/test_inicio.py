from fastapi.testclient import TestClient

from main import app


def test_should_report_api_as_operational_when_calling_root():
    # Arrange
    client = TestClient(app)

    # Act
    response = client.get("/")

    # Assert
    assert response.status_code == 200
    assert response.json()["proyecto"] == "ClassKids"
