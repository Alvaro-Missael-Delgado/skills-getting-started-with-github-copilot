"""
Tests for the Mergington High School Activities API
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys

# Add the src directory to the path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


class TestActivities:
    """Tests for the activities endpoints"""

    def test_get_activities(self, client):
        """Test retrieving all activities"""
        response = client.get("/activities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "Chess Club" in data
        assert "Programming Class" in data
        assert "Soccer Team" in data

    def test_get_activities_structure(self, client):
        """Test that activities have the correct structure"""
        response = client.get("/activities")
        data = response.json()
        activity = data["Chess Club"]
        assert "description" in activity
        assert "schedule" in activity
        assert "max_participants" in activity
        assert "participants" in activity
        assert isinstance(activity["participants"], list)

    def test_activity_has_initial_participants(self, client):
        """Test that activities have initial participants"""
        response = client.get("/activities")
        data = response.json()
        chess_club = data["Chess Club"]
        assert len(chess_club["participants"]) > 0
        assert "michael@mergington.edu" in chess_club["participants"]


class TestSignup:
    """Tests for the signup endpoint"""

    def test_signup_new_participant(self, client):
        """Test signing up a new participant for an activity"""
        response = client.post(
            "/activities/Art Club/signup?email=newstudent@mergington.edu",
            headers={}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "newstudent@mergington.edu" in data["message"]
        assert "Art Club" in data["message"]

    def test_signup_duplicate_participant(self, client):
        """Test that a participant cannot sign up twice for the same activity"""
        # First signup
        response1 = client.post(
            "/activities/Drama Club/signup?email=duplicate@mergington.edu"
        )
        assert response1.status_code == 200

        # Second signup (should fail)
        response2 = client.post(
            "/activities/Drama Club/signup?email=duplicate@mergington.edu"
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "already signed up" in data["detail"]

    def test_signup_nonexistent_activity(self, client):
        """Test signing up for an activity that does not exist"""
        response = client.post(
            "/activities/Nonexistent Club/signup?email=test@mergington.edu"
        )
        assert response.status_code == 404
        data = response.json()
        assert "Activity not found" in data["detail"]

    def test_signup_is_reflected_in_activities(self, client):
        """Test that a signup is reflected in the activities list"""
        email = "reflection@mergington.edu"
        # Signup
        client.post(f"/activities/Science Club/signup?email={email}")
        
        # Check activities
        response = client.get("/activities")
        data = response.json()
        assert email in data["Science Club"]["participants"]


class TestUnregister:
    """Tests for the unregister endpoint"""

    def test_unregister_participant(self, client):
        """Test unregistering a participant from an activity"""
        email = "unregister_test@mergington.edu"
        # First, sign up
        client.post(f"/activities/Debate Team/signup?email={email}")
        
        # Then unregister
        response = client.post(
            f"/activities/Debate Team/unregister?email={email}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "Unregistered" in data["message"]
        assert email in data["message"]

    def test_unregister_nonexistent_activity(self, client):
        """Test unregistering from an activity that does not exist"""
        response = client.post(
            "/activities/Nonexistent Club/unregister?email=test@mergington.edu"
        )
        assert response.status_code == 404
        data = response.json()
        assert "Activity not found" in data["detail"]

    def test_unregister_nonexistent_participant(self, client):
        """Test unregistering a participant who is not registered"""
        response = client.post(
            "/activities/Soccer Team/unregister?email=notregistered@mergington.edu"
        )
        assert response.status_code == 400
        data = response.json()
        assert "not registered" in data["detail"]

    def test_unregister_is_reflected_in_activities(self, client):
        """Test that an unregister is reflected in the activities list"""
        email = "unregister_reflection@mergington.edu"
        # Signup
        client.post(f"/activities/Track and Field/signup?email={email}")
        
        # Verify signup
        response = client.get("/activities")
        data = response.json()
        assert email in data["Track and Field"]["participants"]
        
        # Unregister
        client.post(f"/activities/Track and Field/unregister?email={email}")
        
        # Verify unregister
        response = client.get("/activities")
        data = response.json()
        assert email not in data["Track and Field"]["participants"]


class TestRoot:
    """Tests for the root endpoint"""

    def test_root_redirect(self, client):
        """Test that the root endpoint redirects to static content"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307  # Redirect status code
        assert response.headers["location"] == "/static/index.html"
