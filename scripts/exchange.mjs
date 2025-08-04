import { loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

const fromSelect = document.getElementById("currency");
const toSelect = document.getElementById("to-currency");
const form = document.getElementById("exchange-form");
const resultDiv = document.getElementById("result");
const currencies = document.getElementById("currencies");

let rateChart; // chart instance

// ✅ Draw exchange rate graph
async function drawChart(from, to) {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14); // last 14 days for better view
  const startStr = startDate.toISOString().split("T")[0];

  try {
    const resp = await fetch(
      `https://api.frankfurter.dev/v1/${startStr}..${endDate}?from=${from}&to=${to}`
    );
    const data = await resp.json();

    if (!data.rates) return;

    // Extract dates and rates
    const labels = Object.keys(data.rates);
    const values = Object.values(data.rates).map(rate => rate[to]);

    const ctx = document.getElementById("rateChart").getContext("2d");

    // Create chart if not exists, update if already exists
    if (!rateChart) {
      rateChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: `Exchange Rate: 1 ${from} to ${to}`,
            data: values,
            borderColor: "#0077cc",
            backgroundColor: "rgba(0,119,204,0.2)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#0077cc"
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true }
          },
          scales: {
            x: { title: { display: true, text: "Date" } },
            y: { title: { display: true, text: `1 ${from} in ${to}` } }
          }
        }
      });
    } else {
      // Update chart
      rateChart.data.labels = labels;
      rateChart.data.datasets[0].data = values;
      rateChart.data.datasets[0].label = `Exchange Rate: 1 ${from} to ${to}`;
      rateChart.update();
    }
  } catch (error) {
    console.error("Error fetching historical data:", error);
  }
}

// ✅ Load currency options dynamically
fetch("https://api.frankfurter.dev/v1/currencies")
  .then(res => res.json())
  .then(currencies => {
    for (const [code, name] of Object.entries(currencies)) {
      fromSelect.add(new Option(`${code} - ${name}`, code));
      toSelect.add(new Option(`${code} - ${name}`, code));
    }
  });

// ✅ Handle form submission
form.addEventListener("submit", e => {
  e.preventDefault();

  const from = fromSelect.value;
  const to = toSelect.value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!from || !to || isNaN(amount)) {
    resultDiv.textContent = "⚠️ Please fill in all fields.";
    return;
  }

  fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`)
    .then(resp => resp.json())
    .then(data => {
      if (!data.rates[to]) {
        resultDiv.textContent = "⚠️ Conversion not available.";
        return;
      }
      const convertedAmount = (amount * data.rates[to]).toFixed(2);
      resultDiv.textContent = `${amount} ${from} = ${convertedAmount} ${to}`;

      // ✅ Show exchange rate graph for selected pair
      drawChart(from, to);
    })
    .catch(() => {
      resultDiv.textContent = "❌ Failed to fetch rates. Check your connection and try again.";
    });
});


function renderCurrency(data){
  Object.entries(data).forEach(([code, name]) => {
    const currencyItem = document.createElement("li");
    currencyItem.textContent = `${code} - ${name}`;
    currencies.appendChild(currencyItem);
  })

}

  // ✅ Load supported currencies dynamically
async function supportedCurrencies() {
   const response = await fetch("https://api.frankfurter.dev/v1/currencies");
   if(!response.ok){
       throw new Error("Error:", response.status)
   }
   const data = await response.json();
   console.log(data)
   renderCurrency(data);
}

supportedCurrencies();

const newsContainer = document.getElementById("forexnews-container");

function renderForexNews(data) {
    newsContainer.innerHTML = ""; // clear before adding new

    // ✅ Check if results exist
    if (!data || !data.results || !Array.isArray(data.results)) {
        newsContainer.innerHTML = `<p>⚠️ No news available at the moment. Please check back later.</p>`;
        console.error("Invalid API response:", data);
        return;
    }

    data.results.forEach(article => {
        // skip if missing essential fields
        if (!article.title || !article.link) return;

        const card = document.createElement("div");
        card.classList.add("news-card");

        card.innerHTML = `
            ${article.image_url 
                ? `<img src="${article.image_url}" alt="${article.title}" class="news-image">` 
                : `<div class="news-placeholder">📰</div>`}
            
            <h3>
                <a href="${article.link}" target="_blank" rel="noopener noreferrer">
                    ${article.title}
                </a>
            </h3>
            <p>${article.description || "No description available."}</p>
        `;

        newsContainer.appendChild(card);
    });
}

async function getForexNews() {
    const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24hrs
    const cached = localStorage.getItem("newsCache_newsdata");
    const cachedTime = localStorage.getItem("newsCacheTime_newsdata");
    const display = document.getElementById("status");

    // ✅ Show cached news if available
    if (cached) {
        renderForexNews(JSON.parse(cached));
        display.textContent = "Showing Avaialble news (updates every 24 hours)";
    }

    // ✅ Fetch fresh news if cache is missing or expired
    if (!cachedTime || (Date.now() - cachedTime > CACHE_EXPIRY)) {
        try {
            const apiKey = "pub_8d9dde806129436faea709570917643d"; 
            const proxyUrl = "https://api.allorigins.win/get?url=";
            const targetUrl = encodeURIComponent(
              `https://newsdata.io/api/1/news?apikey=${apiKey}&q=forex&language=en`
            );
            const url = proxyUrl + targetUrl;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const proxyData = await response.json();
            const data = JSON.parse(proxyData.contents);

            if (!data.results) {
                display.textContent = "⚠️ Unable to load fresh news. Showing cached news.";
                return;
            }

            console.log("Fetched fresh news:", data);

            // Save fresh data + timestamp
            localStorage.setItem("newsCache_newsdata", JSON.stringify(data));
            localStorage.setItem("newsCacheTime_newsdata", Date.now());

            renderForexNews(data);
            display.textContent = "Showing fresh news (updated just now)";
        } catch (error) {
            console.error("Failed to fetch news:", error);
            if (!cached) {
                newsContainer.innerHTML = `<p>⚠️ Unable to load news. Please check back later.</p>`;
            }
        }
    }
}

getForexNews();
