const apiKey = "1d580865d7039710695991aae9a625f6";
const contactAccessKey = "PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE";

let currentMap = null;

window.onload = function () {
  renderSavedLocations();
};

async function getWeather() {
  const query = document.getElementById("cityInput").value.trim();

  if (!query) {
    showMessage("Please enter a location.", "Example: 67217 or Wichita, KS.");
    return;
  }

  if (/^\d{5}$/.test(query)) {
    loadWeather(
      `https://api.openweathermap.org/data/2.5/weather?zip=${query},US&units=imperial&appid=${apiKey}`,
      `https://api.openweathermap.org/data/2.5/forecast?zip=${query},US&units=imperial&appid=${apiKey}`
    );
  } else {
    loadWeather(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=imperial&appid=${apiKey}`,
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&units=imperial&appid=${apiKey}`
    );
  }
}

function getWeatherByLocation() {
  if (!navigator.geolocation) {
    showMessage("Location not supported.", "Please enter a ZIP code or city.");
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    loadWeather(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`,
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    );
  }, () => {
    showMessage("Unable to access your location.", "Please enter a ZIP code or city instead.");
  });
}

async function loadWeather(currentUrl, forecastUrl) {
  try {
    showMessage("Loading your forecast...", "Checking radar, alerts, current conditions, and forecast guidance.");

    const currentResponse = await fetch(currentUrl);
    const forecastResponse = await fetch(forecastUrl);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error("Weather unavailable");
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    const airData = await getAirQualityData(currentData.coord.lat, currentData.coord.lon);
    const alerts = await getWeatherAlerts(currentData.coord.lat, currentData.coord.lon);

    renderWeather(currentData, forecastData, airData, alerts);

  } catch {
    showMessage("Unable to retrieve weather data.", "Please check the location and try again.");
  }
}

async function getAirQualityData(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    return await response.json();
  } catch {
    return null;
  }
}

async function getWeatherAlerts(lat, lon) {
  try {
    const response = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`);
    const data = await response.json();
    return data.features || [];
  } catch {
    return [];
  }
}

function renderWeather(currentData, forecastData, airData, alerts) {
  const temp = Math.round(currentData.main.temp);
  const feelsLike = Math.round(currentData.main.feels_like);
  const humidity = currentData.main.humidity;
  const wind = Math.round(currentData.wind.speed);
  const description = currentData.weather[0].description;
  const condition = currentData.weather[0].main;
  const icon = getWeatherIcon(condition);

  const sunrise = formatTime(currentData.sys.sunrise);
  const sunset = formatTime(currentData.sys.sunset);
  const airQuality = getAirQuality(airData?.list?.[0]?.main?.aqi);

  const rainTiming = getRainTiming(forecastData);
  const bestWindow = getBestWindow(forecastData);
  const alertHTML = buildAlerts(alerts);

  const forecastCards = forecastData.list.slice(0, 8).map(item => {
    const date = new Date(item.dt * 1000);
    const conditionClass = getConditionClass(item.weather[0].main);

    return `
      <div class="forecast-card ${conditionClass}">
        <div class="forecast-day">${date.toLocaleDateString([], { weekday: "short" })}</div>
        <div class="forecast-time">${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
        <div class="forecast-icon">${getWeatherIcon(item.weather[0].main)}</div>
        <div class="forecast-temp">${Math.round(item.main.temp)}°F</div>
        <div class="forecast-desc">${item.weather[0].description}</div>
      </div>
    `;
  }).join("");

  const extendedCards = buildExtendedOutlook(forecastData);

  document.getElementById("weatherResult").innerHTML = `
    ${alertHTML}

    <div class="current-weather-card">
      <div class="current-left">
        <div class="current-icon">${icon}</div>
        <div>
          <h2>${currentData.name}</h2>
          <p class="weather-desc">${description}</p>
        </div>
      </div>

      <div class="current-temp">${temp}°F</div>

      <div class="weather-stats">
        <div><span>Feels Like</span><strong>${feelsLike}°F</strong></div>
        <div><span>Humidity</span><strong>${humidity}%</strong></div>
        <div><span>Wind</span><strong>${wind} mph</strong></div>
      </div>
    </div>

    <button class="save-btn" onclick="saveLocation('${currentData.name.replace(/'/g, "")}')">⭐ Save ${currentData.name}</button>

    <div class="note-card">
      <div class="note-icon">💬</div>
      <div>
        <h3>Weatherman’s Note</h3>
        <p>${getWeatherNote(temp, wind, description)}</p>
      </div>
    </div>

    <div class="quick-grid">
      <div class="quick-card">
        <div class="quick-icon">✅</div>
        <h3>Best Window Today</h3>
        <p>${bestWindow}</p>
      </div>

      <div class="quick-card">
        <div class="quick-icon">🌧️</div>
        <h3>Rain Timing</h3>
        <p>${rainTiming}</p>
      </div>

      <div class="quick-card">
        <div class="quick-icon">🚗</div>
        <h3>Driving Guidance</h3>
        <p>${getVehicleTip(temp, wind, description)}</p>
      </div>
    </div>

    <div class="details-grid">
      <div class="image-detail-card sunrise-bg">
        <div class="image-overlay"></div>
        <div class="image-detail-content">
          <h3>Sunrise</h3>
          <strong>${sunrise}</strong>
        </div>
      </div>

      <div class="image-detail-card sunset-bg">
        <div class="image-overlay"></div>
        <div class="image-detail-content">
          <h3>Sunset</h3>
          <strong>${sunset}</strong>
        </div>
      </div>

      <div class="image-detail-card air-bg">
        <div class="image-overlay"></div>
        <div class="image-detail-content">
          <h3>Air Quality</h3>
          <strong>${airQuality}</strong>
        </div>
      </div>
    </div>

    <div class="radar-card">
      <div class="forecast-heading">
        <h2>Local Radar</h2>
        <p>Live precipitation radar for your area.</p>
      </div>
      <div id="radarMap"></div>
      <p id="radarStatus" class="radar-status">Loading radar...</p>
    </div>

    <div class="forecast-heading">
      <h2>Your Day Ahead</h2>
      <p>Forecast updates in 3-hour intervals.</p>
    </div>

    <div class="forecast-grid">${forecastCards}</div>

    <div class="forecast-heading extended-heading">
      <h2>Extended Outlook</h2>
      <p>A simple multi-day look based on available forecast data.</p>
    </div>

    <div class="forecast-grid">${extendedCards}</div>
  `;

  setTimeout(() => renderRadar(currentData.coord.lat, currentData.coord.lon), 300);
}

function renderRadar(lat, lon) {
  const radarStatus = document.getElementById("radarStatus");

  try {
    if (typeof L === "undefined") {
      if (radarStatus) {
        radarStatus.textContent = "Radar map library did not load. Please refresh the page.";
      }
      return;
    }

    if (currentMap) {
      currentMap.remove();
      currentMap = null;
    }

    currentMap = L.map("radarMap", {
      scrollWheelZoom: false
    }).setView([lat, lon], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18
    }).addTo(currentMap);

    L.marker([lat, lon]).addTo(currentMap);

    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then(response => response.json())
      .then(data => {
        if (!data || !data.radar || !data.radar.past || !data.radar.past.length) {
          throw new Error("No radar frames available");
        }

        const frames = data.radar.past;
        const latest = frames[frames.length - 1];

        L.tileLayer(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`, {
          opacity: 0.65,
          attribution: "Radar © RainViewer"
        }).addTo(currentMap);

        setTimeout(() => {
          currentMap.invalidateSize();
        }, 200);

        if (radarStatus) {
          radarStatus.textContent = "Radar layer loaded.";
        }
      })
      .catch(() => {
        if (radarStatus) {
          radarStatus.textContent = "Radar layer is temporarily unavailable, but the map is still active.";
        }
      });

  } catch {
    if (radarStatus) {
      radarStatus.textContent = "Radar is temporarily unavailable. Please try again later.";
    }
  }
}

function buildAlerts(alerts) {
  if (!alerts.length) {
    return `
      <div class="alert-card calm-alert">
        <strong>No active NWS alerts for this location right now.</strong>
        <p>That can change quickly, so check back if weather is developing.</p>
      </div>
    `;
  }

  return alerts.slice(0, 3).map(alert => `
    <div class="alert-card">
      <strong>${alert.properties.event}</strong>
      <p>${alert.properties.headline || "Weather alert active for your area."}</p>
    </div>
  `).join("");
}

function buildExtendedOutlook(forecastData) {
  const days = {};

  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const key = date.toLocaleDateString();

    if (!days[key]) {
      days[key] = {
        day: date.toLocaleDateString([], { weekday: "short" }),
        temps: [],
        condition: item.weather[0].main,
        description: item.weather[0].description
      };
    }

    days[key].temps.push(item.main.temp);
  });

  return Object.values(days).slice(0, 5).map(day => `
    <div class="forecast-card ${getConditionClass(day.condition)}">
      <div class="forecast-day">${day.day}</div>
      <div class="forecast-icon">${getWeatherIcon(day.condition)}</div>
      <div class="forecast-temp">${Math.round(Math.max(...day.temps))}° / ${Math.round(Math.min(...day.temps))}°</div>
      <div class="forecast-desc">${day.description}</div>
    </div>
  `).join("");
}

function getRainTiming(forecastData) {
  const rain = forecastData.list.find(item =>
    item.weather[0].main.includes("Rain") ||
    item.weather[0].main.includes("Thunder") ||
    item.pop > 0.45
  );

  if (!rain) return "No strong rain signal in the next several forecast windows.";

  const date = new Date(rain.dt * 1000);
  return `Rain chances appear higher around ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
}

function getBestWindow(forecastData) {
  const best = forecastData.list.slice(0, 8).find(item =>
    item.pop < 0.25 &&
    item.wind.speed < 15 &&
    item.main.temp > 50 &&
    item.main.temp < 88
  );

  if (!best) return "No perfect window showing yet. Keep an eye on the forecast blocks below.";

  const date = new Date(best.dt * 1000);
  return `Best-looking window: ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
}

function getConditionClass(condition) {
  if (condition.includes("Thunder")) return "condition-storm";
  if (condition.includes("Rain") || condition.includes("Drizzle")) return "condition-rain";
  if (condition.includes("Snow")) return "condition-snow";
  if (condition.includes("Cloud")) return "condition-cloud";
  if (condition.includes("Clear")) return "condition-clear";
  if (condition.includes("Mist") || condition.includes("Fog") || condition.includes("Haze")) return "condition-fog";
  return "condition-default";
}

function getWeatherIcon(condition) {
  if (condition.includes("Thunder")) return "⛈️";
  if (condition.includes("Rain")) return "🌧️";
  if (condition.includes("Drizzle")) return "🌦️";
  if (condition.includes("Snow")) return "❄️";
  if (condition.includes("Cloud")) return "☁️";
  if (condition.includes("Clear")) return "☀️";
  if (condition.includes("Mist") || condition.includes("Fog") || condition.includes("Haze")) return "🌫️";
  return "🌤️";
}

function getWeatherNote(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("rain")) return "Grab the galoshes — it’s wet out there.";
  if (text.includes("storm") || text.includes("thunder")) return "Keep one eye on the sky today. Storms can change plans quickly.";
  if (temp >= 90) return "It’s a hot one. Shade, water, and common sense go a long way.";
  if (temp <= 35) return "Bundle up. This is the kind of cold that sneaks into your sleeves.";
  if (wind >= 20) return "Hold onto your hat — it’s breezier than it may look.";
  if (text.includes("clear")) return "Pretty nice setup today. A good day to enjoy the sky.";
  return "Nothing too dramatic right now. A good day to check the forecast before heading out.";
}

function getVehicleTip(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("rain") || text.includes("storm")) return "Allow extra stopping distance and check wipers before heading out.";
  if (temp >= 90) return "Heat can be hard on tires and batteries. Avoid leaving pets, drinks, or electronics in the car.";
  if (temp <= 35) return "Cold weather can affect tire pressure and battery strength.";
  if (wind >= 20) return "Expect stronger gusts on highways, bridges, and open roads.";

  return "Driving conditions look generally manageable right now.";
}

function getAirQuality(aqi) {
  if (!aqi) return "Unavailable";
  if (aqi === 1) return "Good";
  if (aqi === 2) return "Fair";
  if (aqi === 3) return "Moderate";
  if (aqi === 4) return "Poor";
  if (aqi === 5) return "Very Poor";
  return "Unavailable";
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function showMessage(title, message) {
  document.getElementById("weatherResult").innerHTML = `
    <div class="welcome-card">
      <div class="welcome-icon">🌤️</div>
      <h2>${title}</h2>
      <p>${message}</p>
    </div>
  `;
}

function saveLocation(city) {
  let saved = JSON.parse(localStorage.getItem("savedWeatherLocations")) || [];

  if (!saved.includes(city)) {
    saved.push(city);
    localStorage.setItem("savedWeatherLocations", JSON.stringify(saved));
  }

  renderSavedLocations();
}

function renderSavedLocations() {
  const container = document.getElementById("savedLocations");
  if (!container) return;

  const saved = JSON.parse(localStorage.getItem("savedWeatherLocations")) || [];

  container.innerHTML = saved.map(city => `
    <button onclick="loadSavedLocation('${city}')">${city}</button>
  `).join("");
}

function loadSavedLocation(city) {
  document.getElementById("cityInput").value = city;
  getWeather();
}

function openContactForm() {
  document.getElementById("contactModal").classList.add("active");
}

function closeContactForm() {
  document.getElementById("contactModal").classList.remove("active");
}

document.getElementById("contactForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const status = document.getElementById("formStatus");

  if (contactAccessKey === "PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE") {
    status.textContent = "Contact form needs a Web3Forms access key before it can send.";
    return;
  }

  const formData = new FormData(this);
  formData.append("access_key", contactAccessKey);
  formData.append("subject", "New message from Your Local Weatherman");

  status.textContent = "Sending...";

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      status.textContent = "Thanks! Your message has been sent.";
      this.reset();
    } else {
      status.textContent = "Something went wrong. Please try again.";
    }
  } catch {
    status.textContent = "Unable to send message right now.";
  }
});
