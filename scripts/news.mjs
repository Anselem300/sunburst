import { loadHeaderFooter} from "./utils.mjs";

loadHeaderFooter();

const newsContainer = document.getElementById("news-container");

function renderNews(data){
    newsContainer.innerHTML = ""; // clear before adding new
    data.data.forEach(article => {
        if(!article.image || !article.author){
            return; // skip this article if image OR author is null
        }
        const card = document.createElement("div");
        card.classList.add("news-card");

        // Populate the card
        card.innerHTML = `
        <img src="${article.image}" alt="${article.title}" class="news-image">
        <h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
        <p><strong>By: </strong>${article.author}</p>
        <p>${article.description || "No description available."}</p>
        `;

        newsContainer.appendChild(card);
    });
}

async function getNews() {
    const CACHE_EXPIRY = 1000 * 60 * 60 * 21; // 21hrs
    const cached = localStorage.getItem("newsCache");
    const cachedTime = localStorage.getItem("newsCacheTime");
    const display = document.getElementById("status");

    // Always render cached news if available (never leave page empty)
    if (cached) {
        renderNews(JSON.parse(cached));
        display.textContent = "Showing Available News (updates every 21 hours)";
    }

    // Fetch new news only if cache is missing or expired
    if (!cachedTime || (Date.now() - cachedTime > CACHE_EXPIRY)) {
      try {
          const apiKey = "ce88a991592abdb206f29987c8196719";
          const proxyUrl = "https://api.allorigins.win/get?url=";
          const targetUrl = encodeURIComponent(`https://api.mediastack.com/v1/news?access_key=${apiKey}&countries=us&limit=1000`);
          const url = proxyUrl + targetUrl;

          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`Error: ${response.status} ${response.statusText}`);
           }

          const proxyData = await response.json();
          const data = JSON.parse(proxyData.contents); // ✅ unwrap Mediastack data
          console.log("Fetched fresh news:", data);

          // Save data + timestamp
          localStorage.setItem("newsCache", JSON.stringify(data));
          localStorage.setItem("newsCacheTime", Date.now());

          renderNews(data);
          display.textContent = "Showing fresh news (updated just now)";
        } catch (error) {
           console.error("Failed to fetch news:", error);
           if (!cached) {
              newsContainer.innerHTML = `<p>⚠️ Unable to load news. Please check back later.</p>`;
            }
        }
    }
}

getNews();