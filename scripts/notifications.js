const API_URL = "https://talkzone-yjiw.onrender.com/api";
let authToken = localStorage.getItem("token");
let username = localStorage.getItem("username");
let currentUserId = localStorage.getItem("userId");

// Redirect if not logged in
if (!authToken) window.location.href = "index.html";

// Display username
const welcomeEl = document.getElementById("welcomeUser");
if (welcomeEl) welcomeEl.textContent = `👋 ${username}`;

// Logout function
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// Container for notifications
const container = document.getElementById("notificationsContainer");

// Helper to render a single notification
function renderNotification(n) {
  if (!container) return;
  const div = document.createElement("div");
  div.className = "notification";
  div.innerHTML = `
    <p>${n.message}</p>
    <small>${n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</small>
  `;
  container.prepend(div); // newest on top
}

// ---------------- LOAD PAST NOTIFICATIONS ----------------
async function loadNotifications() {
  if (!container) return;
  container.innerHTML = "<h2>Notifications</h2>";

  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (!res.ok) {
      container.innerHTML += "<p>No notifications found.</p>";
      return;
    }

    const notifications = await res.json();
    if (!notifications.length) {
      container.innerHTML += "<p>No notifications yet.</p>";
    } else {
      notifications.forEach(renderNotification);
    }
  } catch (err) {
    console.error("Notifications Error:", err);
    container.innerHTML += "<p>Failed to load notifications.</p>";
  }
}

// ---------------- SOCKET.IO REAL-TIME ----------------
const socket = io("https://talkzone-yjiw.onrender.com");

// Join the user's personal room if we have an ID
if (currentUserId) socket.emit("joinRoom", currentUserId);

// Listen for new notifications
socket.on("notification", (notif) => {
  renderNotification(notif);
});

// Initialize
loadNotifications();
