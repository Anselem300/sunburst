const API_URL = "https://talkzone-yjiw.onrender.com/api";

// Elements
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// Toggle forms
function toggleForm() {
  loginForm.classList.toggle("hidden");
  registerForm.classList.toggle("hidden");
  clearErrors();
}

// Toggle password visibility
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === "password" ? "text" : "password";
}

// --- VALIDATION HELPERS ---
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPassword(password) {
  return password.length >= 6;
}
function isValidUsername(username) {
  return username.trim().length >= 3;
}

// Clear error messages
function clearErrors() {
  document.querySelectorAll(".error-msg").forEach(e => e.textContent = "");
}

// --- REGISTER ---
if(registerForm){
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById("regUsername").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;

    let hasError = false;

    if(!isValidUsername(username)){
      document.getElementById("regUsernameError").textContent = "Username must be at least 3 characters.";
      hasError = true;
    }
    if(!isValidEmail(email)){
      document.getElementById("regEmailError").textContent = "Invalid email address.";
      hasError = true;
    }
    if(!isValidPassword(password)){
      document.getElementById("regPasswordError").textContent = "Password must be at least 6 characters.";
      hasError = true;
    }
    if(hasError) return;

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if(res.ok){
        alert("✅ Registration successful! You can now login.");
        toggleForm();
      } else {
        alert("❌ Registration failed: " + (data.message || JSON.stringify(data)));
      }
    } catch(err){
      alert("❌ Error: " + err.message);
    }
  });
}

// --- LOGIN ---
if(loginForm){
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    let hasError = false;

    if(!isValidEmail(email)){
      document.getElementById("loginEmailError").textContent = "Invalid email address.";
      hasError = true;
    }
    if(!isValidPassword(password)){
      document.getElementById("loginPasswordError").textContent = "Password must be at least 6 characters.";
      hasError = true;
    }
    if(hasError) return;

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(res.ok && data.token && data.user){
        // Store login info
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("userId", data.user._id);

        // Redirect to Home page
        window.location.href = "home.html";
      } else {
        document.getElementById("loginPasswordError").textContent = "Login failed. Check credentials.";
      }
    } catch(err){
      alert("❌ Error: " + err.message);
    }
  });
}
