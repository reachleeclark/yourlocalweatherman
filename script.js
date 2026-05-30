const API_KEY = "PASTE_YOUR_OPENWEATHER_API_KEY_HERE";

const locationInput = document.getElementById("locationInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const suggestionsBox = document.getElementById("suggestions");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");

let currentLocation = null;
let map;
let weatherLayer;

searchBtn.addEventListener("click", () => handleSearch(locationInput.value));
geoBtn.addEventListener("click", useCurrentLocation);
saveFavoriteBtn.addEventListener("click", saveFavorite);

locationInput.addEventListener("input", debounce(async () => {
  const query = locationInput.value.trim();

  if (query.length < 3) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  const results = await getLocationSuggestions(query);
  renderSuggestions(results);
}, 350));

document.querySelectorAll(".map-layer").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".map-layer").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    updateMapLayer(button.dataset.layer);
  });
});

loadFavorites();

async function handleSearch(query) {
  if (!query.trim()) return;

  const results = await getLocationSuggestions(query);

  if (!results.length) {
    alert("I couldn't find that location. Try city + state, like Myrtle Beach, South Carolina.");
    return;
  }

  const place = results[0];
  await loadWeather(place.lat, place.lon, place.name, place.state, place.country);
  suggestionsBox.classList.add("hidden");
}

async function getLocationSuggestions(query) {
  const cleaned = query.trim();

  if (/^\d{5}$/.test(cleaned)) {
    const zipUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${cleaned},US&appid=${API_KEY}`;
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) return [];
    const zipData = await zipResponse.json();

    return [{
      name: zipData.name,
      state: "",
      country: zipData.country,
      lat: zipData.lat,
      lon: zipData.lon
    }];
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleaned)}&limit=6&appid=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();

  return data.map(item => ({
    name: item.name,
    state: item.state || "",
    country: item.country,
    lat: item.lat,
    lon: item.lon
  }));
}

function renderSuggestions(results) {
  if (!results.length) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  suggestionsBox.innerHTML = "";

  results.forEach(place => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = formatPlace(place);

    item.addEventListener("click", async () => {
      locationInput.value = formatPlace(place);
      suggestionsBox.classList.add("hidden");
      await loadWeather(place.lat, place.lon, place.name, place.state, place.country);
    });

    suggestionsBox.appendChild(item);
  });

  suggestionsBox.classList.remove("hidden");
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported on this device.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;

    const reverseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
    const response = await fetch(reverseUrl);
    const data = await response.json();
    const place = data[0];

    await loadWeather(
      latitude,
      longitude,
      place?.name || "Your Location",
      place?.state || "",
      place?.country || "US"
    );
  }, () => {
    alert("I couldn't access your location.");
  });
}

async function loadWeather(lat, lon, name, state, country) {
  currentLocation = { lat, lon, name, state, country };

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;
  const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  const [weatherRes, forecastRes, airRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(forecastUrl),
    fetch(airUrl)
  ]);

  const weather = await weatherRes.json();
  const forecast = await forecastRes.json();
  const air = await airRes.json();

  renderCurrent(weather, name, state);
  renderForecast(forecast);
  renderRainTiming(forecast);
  renderLifestyle(weather, forecast);
  renderBrief(weather, forecast, name);
  renderDetails(weather, air);
  loadAlerts(lat, lon);
  renderMap(lat, lon);
  showSections();
  loadFavorites();
}

function renderCurrent(weather, name, state) {
  document.getElementById("locationName").textContent = state ? `${name}, ${state}` : name;
  document.getElementById("weatherDescription").textContent = weather.weather[0].description;
  document.getElementById("currentTemp").textContent = `${Math.round(weather.main.temp)}°`;
  document.getElementById("feelsLike").textContent = `${Math.round(weather.main.feels_like)}°`;
  document.getElementById("windSpeed").textContent = `${Math.round(weather.wind.speed)} mph`;
  document.getElementById("humidity").textContent = `${weather.main.humidity}%`;
  document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
}

function renderForecast(forecast) {
  const container = document.getElementById("forecastCards");
  container.innerHTML = "";

  const daily = {};

  forecast.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toLocaleDateString("en-US", { weekday: "short" });

    if (!daily[day]) {
      daily[day] = {
        temps: [],
        description: item.weather[0].description,
        main: item.weather[0].main,
        icon: item.weather[0].icon
      };
    }

    daily[day].temps.push(item.main.temp);
  });

  Object.entries(daily).slice(0, 5).forEach(([day, data]) => {
    const high = Math.round(Math.max(...data.temps));
    const low = Math.round(Math.min(...data.temps));

    const card = document.createElement("div");
    card.className = `forecast-card ${getConditionClass(data.main)}`;

    card.innerHTML = `
      <h3>${day}</h3>
      <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="">
      <div class="temps">${high}° / ${low}°</div>
      <p>${data.description}</p>
    `;

    container.appendChild(card);
  });
}

function renderRainTiming(forecast) {
  const rainBars = document.getElementById("rainBars");
  const rainSummary = document.getElementById("rainSummary");

  rainBars.innerHTML = "";

  const nextBlocks = forecast.list.slice(0, 8);

  let highest = {
    time: "",
    chance: 0
  };

  nextBlocks.forEach(item => {
    const chance = Math.round((item.pop || 0) * 100);
    const time = new Date(item.dt * 1000).toLocaleTimeString("en-US", {
      hour: "numeric"
    });

    if (chance > highest.chance) {
      highest = { time, chance };
    }

    const card = document.createElement("div");
    card.className = "rain-bar-card";

    card.innerHTML = `
      <div class="rain-time">${time}</div>
      <div class="rain-bar-track">
        <div class="rain-bar-fill" style="height:${Math.max(chance, 4)}%"></div>
      </div>
      <div class="rain-percent">${chance}%</div>
    `;

    rainBars.appendChild(card);
  });

  if (highest.chance >= 60) {
    rainSummary.textContent = `Rain looks most likely around ${highest.time}, with about a ${highest.chance}% chance. This is the part of the day to plan around.`;
  } else if (highest.chance >= 30) {
    rainSummary.textContent = `There is some rain potential, with the best chance around ${highest.time}. Not a guaranteed washout, but worth watching.`;
  } else {
    rainSummary.textContent = `Rain chances look pretty low over the next several forecast blocks. Good news for most outdoor plans.`;
  }
}

function renderLifestyle(weather, forecast) {
  const container = document.getElementById("lifestyleCards");
  container.innerHTML = "";

  const temp = weather.main.temp;
  const wind = weather.wind.speed;
  const condition = weather.weather[0].main.toLowerCase();
  const rainChance = getRainChance(forecast);

  const items = [
    {
      title: "Grilling",
      good: temp > 45 && wind < 18 && rainChance < 45,
      copy: "Good night to fire it up. Keep an eye on the breeze and have a backup plan if showers creep in."
    },
    {
      title: "Patio Sitting",
      good: temp > 58 && temp < 90 && rainChance < 35,
      copy: "Comfortable enough to linger outside. Shade, a light jacket, or bug spray may decide how long you stay."
    },
    {
      title: "Walking",
      good: temp > 35 && temp < 88 && wind < 22 && !condition.includes("thunder"),
      copy: "Looks workable for a walk. If the sky looks unsettled, keep it close to home or take the shorter loop."
    },
    {
      title: "Kid Sports",
      good: temp > 40 && temp < 92 && rainChance < 50 && wind < 24,
      copy: "Probably playable, but check fields before you load the car. Wet grass and lightning risk are the deal-breakers."
    },
    {
      title: "Errands",
      good: rainChance < 60 && wind < 28,
      copy: "A decent window for normal running around. If rain chances climb, hit the quick stops first."
    }
  ];

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "lifestyle-card";

    let label = "Good";
    let className = "good";

    if (!item.good && rainChance < 60) {
      label = "Use Judgment";
      className = "okay";
    }

    if (!item.good && rainChance >= 60) {
      label = "Not Ideal";
      className = "poor";
    }

    card.innerHTML = `
      <span class="lifestyle-score ${className}">${label}</span>
      <h3>${item.title}</h3>
      <p>${item.copy}</p>
    `;

    container.appendChild(card);
  });
}

function renderBrief(weather, forecast, name) {
  const temp = Math.round(weather.main.temp);
  const feels = Math.round(weather.main.feels_like);
  const wind = Math.round(weather.wind.speed);
  const desc = weather.weather[0].description;
  const rainChance = getRainChance(forecast);

  let message = `Right now in ${name}, it’s ${temp}° and ${desc}. It feels like ${feels}° with wind around ${wind} mph. `;

  if (rainChance >= 60) {
    message += "Rain chances are high enough that you should treat today as a carry-an-umbrella, check-the-radar kind of day.";
  } else if (rainChance >= 30) {
    message += "There’s enough rain potential to keep an eye on the sky, but it does not look like a total washout.";
  } else {
    message += "Overall, this looks like a pretty manageable weather day for most normal plans.";
  }

  document.getElementById("localBrief").textContent = message;
}

function renderDetails(weather, air) {
  document.getElementById("sunriseTime").textContent = formatTime(weather.sys.sunrise);
  document.getElementById("sunsetTime").textContent = formatTime(weather.sys.sunset);

  const aqi = air.list?.[0]?.main?.aqi || null;
  document.getElementById("airQuality").textContent = getAqiLabel(aqi);
}

async function loadAlerts(lat, lon) {
  const alertsSection = document.getElementById("alertsSection");
  const alertsList = document.getElementById("alertsList");

  alertsList.innerHTML = "";

  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    const points = await pointsRes.json();

    if (!points.properties?.forecastZone) {
      alertsSection.classList.add("hidden");
      return;
    }

    const zone = points.properties.forecastZone.split("/").pop();
    const alertsRes = await fetch(`https://api.weather.gov/alerts/active/zone/${zone}`);
    const alerts = await alertsRes.json();

    if (!alerts.features?.length) {
      alertsSection.classList.add("hidden");
      return;
    }

    alerts.features.forEach(alert => {
      const div = document.createElement("div");
      div.className = "alert-card";
      div.innerHTML = `
        <strong>${alert.properties.event}</strong>
        <p>${alert.properties.headline || "Weather alert issued for your area."}</p>
      `;
      alertsList.appendChild(div);
    });

    alertsSection.classList.remove("hidden");
  } catch {
    alertsSection.classList.add("hidden");
  }
}

function renderMap(lat, lon) {
  if (!map) {
    map = L.map("weatherMap").setView([lat, lon], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(map);
  } else {
    map.setView([lat, lon], 8);
  }

  updateMapLayer("precipitation_new");
}

function updateMapLayer(layerName) {
  if (!map) return;

  if (weatherLayer) {
    map.removeLayer(weatherLayer);
  }

  weatherLayer = L.tileLayer(
    `https://tile.openweathermap.org/map/${layerName}/{z}/{x}/{y}.png?appid=${API_KEY}`,
    {
      attribution: "Weather data © OpenWeather",
      opacity: 0.62
    }
  ).addTo(map);
}

function saveFavorite() {
  if (!currentLocation) return;

  const favorites = JSON.parse(localStorage.getItem("weathermanFavorites") || "[]");

  const exists = favorites.some(place =>
    Math.abs(place.lat - currentLocation.lat) < 0.01 &&
    Math.abs(place.lon - currentLocation.lon) < 0.01
  );

  if (!exists) {
    favorites.push(currentLocation);
    localStorage.setItem("weathermanFavorites", JSON.stringify(favorites));
  }

  loadFavorites();
}

function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem("weathermanFavorites") || "[]");
  const section = document.getElementById("favoritesSection");
  const list = document.getElementById("favoritesList");

  list.innerHTML = "";

  if (!favorites.length) {
    section.classList.add("hidden");
    return;
  }

  favorites.forEach(place => {
    const pill = document.createElement("div");
    pill.className = "favorite-pill";

    pill.innerHTML = `
      <span>${getFavoriteIcon(place.name)}</span>
      <div>${place.name}<br><small>${place.state || place.country}</small></div>
    `;

    pill.addEventListener("click", () => {
      loadWeather(place.lat, place.lon, place.name, place.state, place.country);
    });

    list.appendChild(pill);
  });

  section.classList.remove("hidden");
}

function getFavoriteIcon(name) {
  const lower = name.toLowerCase();

  if (lower.includes("beach") || lower.includes("myrtle")) return "🌊";
  if (lower.includes("mount") || lower.includes("denver")) return "🏔️";
  if (lower.includes("lake")) return "🌤️";
  if (lower.includes("city")) return "🏙️";

  return "⛅";
}

function getRainChance(forecast) {
  const nextSeveral = forecast.list.slice(0, 6);
  const chances = nextSeveral.map(item => item.pop ? item.pop * 100 : 0);
  return Math.round(Math.max(...chances));
}

function getConditionClass(main) {
  const condition = main.toLowerCase();

  if (condition.includes("clear")) return "condition-clear";
  if (condition.includes("cloud")) return "condition-clouds";
  if (condition.includes("rain") || condition.includes("drizzle")) return "condition-rain";
  if (condition.includes("thunder")) return "condition-storm";
  if (condition.includes("snow")) return "condition-snow";

  return "condition-clouds";
}

function getAqiLabel(aqi) {
  const labels = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor"
  };

  return labels[aqi] || "Unavailable";
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatPlace(place) {
  return [place.name, place.state, place.country].filter(Boolean).join(", ");
}

function showSections() {
  [
    "currentSection",
    "briefSection",
    "rainTimingSection",
    "forecastSection",
    "lifestyleSection",
    "radarSection",
    "detailsSection"
  ].forEach(id => document.getElementById(id).classList.remove("hidden"));
}

function debounce(callback, delay) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delay);
  };
}
