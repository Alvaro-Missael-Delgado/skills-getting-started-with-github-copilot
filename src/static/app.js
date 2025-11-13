document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Simple HTML escaper to avoid injection when inserting participant names
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  
  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML (with delete icon next to each participant)
        let participantsHtml = "";
        if (Array.isArray(details.participants) && details.participants.length) {
          participantsHtml = `
            <div class="participants">
              <h5>Participants</h5>
              <ul>
                ${details.participants
                  .map((p) => `
                    <li>
                      <span class="participant-email">${escapeHtml(p)}</span>
                      <button class="delete-participant" title="Remove participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" style="background:none;border:none;cursor:pointer;padding:0;margin-left:8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#c62828" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm2 3h14v13H5V9zm2 2v9h2v-9H7zm4 0v9h2v-9h-2zm4 0v9h2v-9h-2z"/></svg>
                      </button>
                    </li>
                  `)
                  .join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHtml = `
            <div class="participants">
              <h5>Participants</h5>
              <ul>
                <li>No participants yet</li>
              </ul>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners for delete buttons
      document.querySelectorAll(".delete-participant").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const activity = btn.getAttribute("data-activity");
          const email = btn.getAttribute("data-email");
          if (!activity || !email) return;
          btn.disabled = true;
          try {
            const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
              method: "POST"
            });
            const result = await response.json();
            if (response.ok) {
              messageDiv.textContent = result.message;
              messageDiv.className = "success";
              messageDiv.classList.remove("hidden");
              // Refresh activities list
              await fetchActivities();
            } else {
              messageDiv.textContent = result.detail || "An error occurred";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }
            setTimeout(() => {
              messageDiv.classList.add("hidden");
            }, 5000);
          } catch (error) {
            messageDiv.textContent = "Failed to unregister participant. Please try again.";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
            setTimeout(() => {
              messageDiv.classList.add("hidden");
            }, 5000);
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities(); // Refresh activities list after signup
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
