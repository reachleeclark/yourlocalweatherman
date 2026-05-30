const API_KEY = "PASTE_YOUR_OPENWEATHER_API_KEY_HERE";

const locationInput = document.getElementById("locationInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const suggestionsBox = document.getElementById("suggestions");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");

let currentLocation = null;
let map = null;
let weatherLayer = null;

searchBtn.addEventListener("click", () => handleSearch(locationInput.value));
geoBtn.addEventListener("click", useCurrentLocation);
saveFavoriteBtn.addEventListener("click", saveFavorite);

locationInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    handleSearch(locationInput.value);
  }
});

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

  try {
    const results = await getLocationSuggestions(query);

    if (!results.length) {
      alert("I couldn't find that location. Try city + state, like Myrtle Beach, South Carolina.");
      return;
    }

    const place = results[0];

    await loadWeather(
      place.lat,
      place.lon,
      place.name,
      place.state,
      place.country
    );

    suggestionsBox.classList.add("hidden");
  } catch (error) {
    console.error(error);
    alert("Something went wrong getting the weather. Please check your API key and try again.");
  }
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

      await loadWeather(
        place.lat,
        place.lon,
        place.name,
        place.state,
        place.country
      );
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
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      const reverseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
      const response = await fetch(reverseUrl);
      const data = await response.json();
      const place = data[0];

      await loadWeather(
        lat,
        lon,
        place?.name || "Your Location",
        place?.state || "",
        place?.country || "US"
      );
    } catch (error) {
      console.error(error);
      alert("I couldn't load your location weather.");
    }
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

  if (!weatherRes.ok || !forecastRes.ok) {
    throw new Error("Weather API request failed.");
  }

  const weather = await weatherRes.json();
  const forecast = await forecastRes.json();
  const air = airRes.ok ? await airRes.json() : null;

  renderCurrent(weather, name, state);
  renderBrief(weather, forecast, name);
  renderRainTiming(forecast);
  renderForecast(forecast);
  renderLifestyle(weather, forecast);
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

function renderBrief(weather, forecast, name) {
  const temp = Math.round(weather.main.temp);
  const feels = Math.round(weather.main.feels_like);
  const wind = Math.round(weather.wind.speed);
  const desc = weather.weather[0].description;
  const rainChance = getRainChance(forecast);

  let message = `Right now in ${name}, it’s ${temp}° with ${desc}. It feels like ${feels}°, and winds are around ${wind} mph. `;

  if (rainChance >= 60) {
    message += "Rain chances are high enough that this is a keep-an-eye-on-the-radar kind of day.";
  } else if (rainChance >= 30) {
    message += "There is some rain potential, but it does not look like an automatic washout.";
  } else {
    message += "Overall, this looks like a manageable day for most normal plans.";
  }

  document.getElementById("localBrief").textContent = message;
}

function renderRainTiming(forecast) {
  const rainBars = document.getElementById("rainBars");
  const rainSummary = document.getElementById("rainSummary");

  rainBars.innerHTML = "";

  const blocks = forecast.list.slice(0, 8);

  let highest = {
    time: "",
    chance: 0
  };

  blocks.forEach(item => {
    const chance = Math.round((item.pop || 0) * 100);
    const time = new Date(item.dt * 1000).toLocaleTimeString("en-US", {
      hour: "numeric"
    });

    if (chance > highest.chance) {
      highest = { time, chance };
    }

    const card = document.createElement("div");
    card.className = "rain-card";

    card.innerHTML = `
      <div class="rain-time">${time}</div>
      <div class="rain-track">
        <div class="rain-fill" style="height:${Math.max(chance, 4)}%"></div>
      </div>
      <div class="rain-percent">${chance}%</div>
    `;

    rainBars.appendChild(card);
  });

  if (highest.chance >= 60) {
    rainSummary.textContent = `Rain looks most likely around ${highest.time}, with about a ${highest.chance}% chance. That is the window to plan around.`;
  } else if (highest.chance >= 30) {
    rainSummary.textContent = `The best rain chance appears to be around ${highest.time}. Not a guaranteed washout, but worth watching.`;
  } else {
    rainSummary.textContent = "Rain chances look fairly low in the next several forecast blocks.";
  }
}

function renderForecast(forecast) {
  const grid = document.getElementById("forecastGrid");
  grid.innerHTML = "";

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

    grid.appendChild(card);
  });
}

function renderLifestyle(weather, forecast) {
  const grid = document.getElementById("lifestyleGrid");
  grid.innerHTML = "";

  const temp = weather.main.temp;
  const wind = weather.wind.speed;
  const condition = weather.weather[0].main.toLowerCase();
  const rainChance = getRainChance(forecast);

  const items = [
    {
      title: "Grilling",
      good: temp > 45 && wind < 18 && rainChance < 45,
      copy: "Good enough to fire it up. Watch the wind and keep a backup plan if rain chances rise."
    },
    {
      title: "Patio Sitting",
      good: temp > 58 && temp < 90 && rainChance < 35,
      copy: "Comfortable enough to sit outside. Shade, breeze, and bugs may be the deciding factors."
    },
    {
      title: "Walking",
      good: temp > 35 && temp < 88 && wind < 22 && !condition.includes("thunder"),
      copy: "Looks workable for a walk. If the sky looks unsettled, take the shorter loop."
    },
    {
      title: "Kid Sports",
      good: temp > 40 && temp < 92 && rainChance < 50 && wind < 24,
      copy: "Probably playable, but check field conditions before loading the car."
    },
    {
      title: "Errands",
      good: rainChance < 60 && wind < 28,
      copy: "A decent window for normal running around. Hit the quick stops first if rain is building."
    }
  ];

  items.forEach(item => {
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

    const card = document.createElement("div");
    card.className = "lifestyle-card";

    card.innerHTML = `
      <span class="lifestyle-score ${className}">${label}</span>
      <h3>${item.title}</h3>
      <p>${item.copy}</p>
    `;

    grid.appendChild(card);
  });
}

function renderDetails(weather, air) {
  document.getElementById("sunrise").textContent = formatTime(weather.sys.sunrise);
  document.getElementById("sunset").textContent = formatTime(weather.sys.sunset);

  const aqi = air?.list?.[0]?.main?.aqi;
  document.getElementById("airQuality").textContent = getAqiLabel(aqi);
}

async function loadAlerts(lat, lon) {
  const alertsSection = document.getElementById("alertsSection");
  const alertsList = document.getElementById("alertsList");

  alertsList.innerHTML = "";

  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    const pointData = await pointRes.json();

    const zoneUrl = pointData.properties?.forecastZone;

    if (!zoneUrl) {
      alertsSection.classList.add("hidden");
      return;
    }

    const zone = zoneUrl.split("/").pop();
    const alertRes = await fetch(`https://api.weather.gov/alerts/active/zone/${zone}`);
    const alertData = await alertRes.json();

    if (!alertData.features || !alertData.features.length) {
      alertsSection.classList.add("hidden");
      return;
    }

    alertData.features.forEach(alert => {
      const div = document.createElement("div");
      div.className = "alert-card";

      div.innerHTML = `
        <strong>${alert.properties.event}</strong>
        <p>${alert.properties.headline || "Weather alert issued for your area."}</p>
      `;

      alertsList.appendChild(div);
    });

    alertsSection.classList.remove("hidden");
  } catch (error) {
    console.warn("NWS alerts unavailable", error);
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

  setTimeout(() => {
    map.invalidateSize();
  }, 250);
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
      <div>${place.name}<br><small>${place.state || place.country || ""}</small></div>
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
  if (lower.includes("lake")) return "🌤️";
  if (lower.includes("mount") || lower.includes("denver")) return "🏔️";
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
    "mapSection",
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
