const API_URL = "https://talkzone-yjiw.onrender.com/api";
let authToken = localStorage.getItem('token') || null;
let username = localStorage.getItem('username') || null;
let currentUserId = localStorage.getItem('userId') || null;
let currentPostId = null;
let currentShareLink = "";

// Setup user display
if (authToken && username) {
  document.getElementById("welcomeUser").textContent = `👋 Welcome, ${username}`;
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* -------- SOCKET.IO REAL-TIME -------- */
const socket = io("https://talkzone-yjiw.onrender.com");

// Join user room for personal notifications
if (currentUserId) socket.emit("joinRoom", currentUserId);

// Listen for new posts
socket.on('newPost', (post) => {
  const container = document.getElementById("postsContainer");
  renderSinglePost(post, container, true);
});

// Listen for post updates
socket.on('updatePost', ({ postId, type, data }) => {
  if (type === 'reaction') loadPosts();
  if (type === 'comment') loadComments(postId);
  if (type === 'view') {
    const countEl = document.getElementById(`viewCount-${postId}`);
    if (countEl) countEl.textContent = data.views;
  }
  if (type === 'share') loadPosts();
});

// ---------------- NOTIFICATIONS ----------------
socket.on('notification', (notif) => {
  // Simple alert for testing
  console.log("New notification:", notif);
  
  // Optional: Show on page
  const container = document.getElementById("notificationsContainer");
  if (container) {
    const div = document.createElement("div");
    div.className = "notification";
    div.innerHTML = `<p>${notif.message}</p>
                     <small>${new Date(notif.createdAt).toLocaleString()}</small>`;
    container.prepend(div);
  }
});

// ---------------- REST OF HOME.JS ----------------
// ... Keep your existing code for posts, comments, reactions, shares, etc.


/* -------- CREATE POST -------- */
document.getElementById("postBtn").addEventListener("click", async () => {
  const content = document.getElementById("postContent").value.trim();
  if (!content || !authToken) return;
  try {
    const res = await fetch(`${API_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ content })
    });
    const post = await res.json();
    document.getElementById("postContent").value = "";
    renderSinglePost(post, document.getElementById("postsContainer"), true);
  } catch (err) {
    console.error("POST ERROR:", err);
  }
});

/* -------- LOAD POSTS -------- */
async function loadPosts() {
  try {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    const container = document.getElementById("postsContainer");
    container.innerHTML = "";

    posts.forEach(post => renderSinglePost(post, container));
  } catch (err) {
    console.error("LOAD POSTS ERROR:", err);
  }
}

/* -------- RENDER SINGLE POST -------- */
function renderSinglePost(post, container, prepend = false) {
  let reactionCounts = {};
  (post.reactions || []).forEach(r => {
    if (r.type) reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
  });

  const groupedReactions = Object.entries(reactionCounts)
    .map(([t, c]) => `${t} ${c}`).join(" · ") || "Be the first to react";

  const isFollowing = Array.isArray(post.user?.followers) &&
                      post.user.followers.includes(currentUserId);

  const div = document.createElement("div");
  div.className = "post";
  div.innerHTML = `
    <div class="post-header">
      <div class="avatar"></div>
      <div>
        <span class="username">${post.user?.username}</span>
        <small>${post.user?.followers?.length || 0} Followers</small>
      </div>
      ${post.user?._id !== currentUserId ? `
        <button class="follow-btn ${isFollowing ? 'unfollow' : 'follow'}"
          onclick="toggleFollow('${post.user._id}')"
          style="margin-left:auto;">
          ${isFollowing ? 'Unfollow' : 'Follow'}
        </button>` : ""}
    </div>

    <div class="post-content">${post.content}</div>

    <div class="post-footer">
      <span>${groupedReactions}</span>
      <div class="post-stats">
        <span> ${post.shares || 0} Shares</span>
        <span>👁️ <span id="viewCount-${post._id}">${post.views || 0}</span> Views</span>
      </div>
    </div>

    <div class="post-actions">
      <div class="reaction-container">
        <button class="like-btn" data-postid="${post._id}">👍 Like</button>
        <div class="reaction-bar" id="reactionBar-${post._id}">
          <button onclick="addReaction('${post._id}', '👍')">👍</button>
          <button onclick="addReaction('${post._id}', '❤️')">❤️</button>
          <button onclick="addReaction('${post._id}', '😂')">😂</button>
          <button onclick="addReaction('${post._id}', '😮')">😮</button>
          <button onclick="addReaction('${post._id}', '😢')">😢</button>
          <button onclick="addReaction('${post._id}', '😡')">😡</button>
        </div>
      </div>
      <button onclick="toggleComments('${post._id}')">
        💬 Comments <span id="commentCount-${post._id}">0</span>
      </button>
      <button onclick="sharePost('${post._id}', 'https://sunbust.netlify.app/post/${post._id}')">🔗 Share</button>
    </div>

    <div class="comments" id="comments-${post._id}" style="display:none;"></div>

    <div class="comment-input">
      <div class="avatar"></div>
      <input type="text" id="commentInput-${post._id}" placeholder="Write a comment..." />
      <button onclick="addComment('${post._id}')">Send</button>
    </div>
  `;

  if (prepend) container.prepend(div); else container.appendChild(div);

  loadComments(post._id);
  incrementView(post._id);

  // Long press for reactions
  const likeBtn = div.querySelector(".like-btn");
  const reactionBar = div.querySelector(`#reactionBar-${post._id}`);
  let pressTimer;

  likeBtn.addEventListener("mousedown", () => {
    pressTimer = setTimeout(() => {
      reactionBar.style.display = "flex";
    }, 500);
  });
  likeBtn.addEventListener("mouseup", () => clearTimeout(pressTimer));
  likeBtn.addEventListener("mouseleave", () => clearTimeout(pressTimer));
  likeBtn.addEventListener("click", () => {
    if (reactionBar.style.display !== "flex") addReaction(post._id, "👍");
  });

  document.addEventListener("click", (e) => {
    if (!div.contains(e.target)) reactionBar.style.display = "none";
  });
}

/* -------- VIEWS HANDLER -------- */
async function incrementView(postId) {
  try {
    const res = await fetch(`${API_URL}/posts/${postId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const countEl = document.getElementById(`viewCount-${postId}`);
      if (countEl) countEl.textContent = data.post.views;
    }
  } catch (err) { console.error("VIEW COUNT ERROR:", err); }
}

/* -------- FOLLOW -------- */
async function toggleFollow(userId) {
  if (!authToken) return;
  await fetch(`${API_URL}/follows`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
    body: JSON.stringify({ userId })
  });
  loadPosts();
}

/* -------- COMMENTS & REPLIES -------- */
async function loadComments(postId) {
  try {
    const res = await fetch(`${API_URL}/comments/${postId}`);
    if (!res.ok) return;
    const comments = await res.json();

    const countEl = document.getElementById(`commentCount-${postId}`);
    if (countEl) countEl.textContent = comments.length;

    const container = document.getElementById(`comments-${postId}`);
    container.innerHTML = "";

    comments.forEach(c => {
      const commentDiv = document.createElement("div");
      commentDiv.className = "comment-wrapper";
      commentDiv.innerHTML = `
        <div class="comment">
          <span class="username">${c.user?.username || "Unknown"}</span>
          <span class="comment-text"> ${c.text}</span>
          <button id="reply" onclick="toggleReplyBox('${c._id}')">Reply</button>
        </div>

        <div class="reply-box" id="replyBox-${c._id}" style="display:none;">
          <input type="text" id="replyInput-${c._id}" placeholder="Reply..." class="reply-input"/>
          <button class="reply-send" onclick="addReply('${c._id}', '${postId}')">Send</button>
        </div>

        <div class="replies" id="replies-${c._id}">
          ${renderReplies(c.replies)}
        </div>
      `;
      container.appendChild(commentDiv);
    });
  } catch (err) { console.error("LOAD COMMENTS ERROR:", err); }
}

function renderReplies(replies) {
  if (!replies || replies.length === 0) return "";
  return replies.map(r =>
    `<div class="reply-wrapper">
      <div class="reply">
        <span class="username">${r.user?.username || "Unknown"}</span>
        <span class="comment-text">${r.text}</span>
      </div>
      ${r.replies ? `<div class="nested-replies">${renderReplies(r.replies)}</div>` : ""}
    </div>`).join("");
}

function toggleReplyBox(commentId) {
  const box = document.getElementById(`replyBox-${commentId}`);
  box.style.display = box.style.display === "none" ? "flex" : "none";
}

function toggleComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  if (container.style.display === "none" || container.style.display === "") {
    container.style.display = "block";
    loadComments(postId);
  } else container.style.display = "none";
}

async function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input.value.trim();
  if (!text || !authToken) return;
  await fetch(`${API_URL}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
    body: JSON.stringify({ postId, text })
  });
  input.value = "";
  loadComments(postId);
}

async function addReply(commentId, postId) {
  const input = document.getElementById(`replyInput-${commentId}`);
  const text = input.value.trim();
  if (!text || !authToken) return;
  await fetch(`${API_URL}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
    body: JSON.stringify({ postId, text, parentCommentId: commentId })
  });
  input.value = "";
  toggleReplyBox(commentId);
  loadComments(postId);
}

/* -------- REACTIONS -------- */
async function addReaction(postId, type) {
  await fetch(`${API_URL}/reactions/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
    body: JSON.stringify({ postId, type })
  });
  loadPosts();
}

/* -------- SHARES -------- */
function sharePost(postId, link) {
  currentPostId = postId;
  openShareModal(link);
}

function openShareModal(link) {
  currentShareLink = link;
  document.getElementById("shareLink").value = link;
  document.getElementById("whatsappBtn").href = `https://wa.me/?text=${encodeURIComponent(link)}`;
  document.getElementById("twitterBtn").href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`;
  document.getElementById("facebookBtn").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  document.getElementById("overlay").style.display = "block";
  document.getElementById("shareModal").style.display = "block";
}
function closeShareModal() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("shareModal").style.display = "none";
}
function copyLink() {
  navigator.clipboard.writeText(currentShareLink);
  recordShare();
}
document.getElementById("nativeShareBtn").addEventListener("click", async () => {
  if (navigator.share) {
    await navigator.share({ title: "Check this post!", url: currentShareLink });
    recordShare();
  }
});
async function recordShare() {
  await fetch(`${API_URL}/posts/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
    body: JSON.stringify({ postId: currentPostId })
  });
  loadPosts();
}

/* -------- INITIAL LOAD -------- */
if (authToken) loadPosts();