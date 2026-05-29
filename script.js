const apiKey = "1d580865d7039710695991aae9a625f6";
const contactAccessKey = "PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE";

const cityInput = document.getElementById("cityInput");
const locationSuggestions = document.getElementById("locationSuggestions");

let selectedLocation = null;
let extendedOutlookHTML = "";

cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  selectedLocation = null;

  if (query.length < 2) return;

  try {
    locationSuggestions.innerHTML = "";

    if (/^\d{5}$/.test(query)) {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${query},US&appid=${apiKey}`
      );

      const data = await response.json();

      if (data.name) {
        const option = document.createElement("option");
        option.value = `${data.name}, ${data.country}`;
        option.dataset.lat = data.lat;
        option.dataset.lon = data.lon;
        locationSuggestions.appendChild(option);
      }

      return;
    }

    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
    );

    const data = await response.json();

    data.forEach(place => {
      const label = `${place.name}${place.state ? ", " + place.state : ""}, ${place.country}`;
      const option = document.createElement("option");
      option.value = label;
      option.dataset.lat = place.lat;
      option.dataset.lon = place.lon;
      locationSuggestions.appendChild(option);
    });

  } catch {
    locationSuggestions.innerHTML = "";
  }
});

cityInput.addEventListener("change", () => {
  const options = Array.from(locationSuggestions.options);
  const match = options.find(option => option.value === cityInput.value);

  if (match) {
    selectedLocation = {
      lat: match.dataset.lat,
      lon: match.dataset.lon
    };
  }
});

async function getWeather() {
  const query = cityInput.value.trim();

  if (!query) {
    showMessage("Please enter a location.", "Example: 67217, Wichita, or Wichita, KS.");
    return;
  }

  if (selectedLocation) {
    loadWeatherByCoords(selectedLocation.lat, selectedLocation.lon);
    return;
  }

  if (/^\d{5}$/.test(query)) {
    loadWeather(
      `https://api.openweathermap.org/data/2.5/weather?zip=${query},US&units=imperial&appid=${apiKey}`,
      `https://api.openweathermap.org/data/2.5/forecast?zip=${query},US&units=imperial&appid=${apiKey}`
    );
    return;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`
    );

    const data = await response.json();

    if (!data.length) throw new Error("Location not found");

    loadWeatherByCoords(data[0].lat, data[0].lon);

  } catch {
    showMessage("Unable to find that location.", "Try entering a ZIP code, city, or city/state.");
  }
}

function getWeatherByLocation() {
  if (!navigator.geolocation) {
    showMessage("Location is not supported.", "Please enter your ZIP code or city instead.");
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    loadWeatherByCoords(position.coords.latitude, position.coords.longitude);
  }, () => {
    showMessage("Unable to access your location.", "Please enter your ZIP code or city instead.");
  });
}

function loadWeatherByCoords(lat, lon) {
  loadWeather(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`,
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
  );
}

async function loadWeather(currentUrl, forecastUrl) {
  try {
    showMessage("Loading your forecast...", "Checking current conditions and forecast windows.");

    const currentResponse = await fetch(currentUrl);
    const forecastResponse = await fetch(forecastUrl);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error("Weather not found");
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    let airData = null;

    try {
      const airResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${currentData.coord.lat}&lon=${currentData.coord.lon}&appid=${apiKey}`
      );
      airData = await airResponse.json();
    } catch {
      airData = null;
    }

    renderWeather(currentData, forecastData, airData);

  } catch {
    showMessage("Unable to retrieve weather data.", "Please check the location and try again.");
  }
}

function renderWeather(currentData, forecastData, airData) {
  const temp = Math.round(currentData.main.temp);
  const feelsLike = Math.round(currentData.main.feels_like);
  const humidity = currentData.main.humidity;
  const wind = Math.round(currentData.wind.speed);
  const description = currentData.weather[0].description;
  const condition = currentData.weather[0].main;
  const currentIcon = getWeatherIcon(condition);

  const sunrise = formatTime(currentData.sys.sunrise);
  const sunset = formatTime(currentData.sys.sunset);
  const airQuality = getAirQuality(airData?.list?.[0]?.main?.aqi);

  const forecastCards = forecastData.list.slice(0, 8).map(item => {
    const date = new Date(item.dt * 1000);

    return `
      <div class="forecast-card">
        <div class="forecast-day">${date.toLocaleDateString([], { weekday: "short" })}</div>
        <div class="forecast-time">${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
        <div class="forecast-icon">${getWeatherIcon(item.weather[0].main)}</div>
        <div class="forecast-temp">${Math.round(item.main.temp)}°F</div>
        <div class="forecast-desc">${item.weather[0].description}</div>
        <div class="forecast-detail">Wind: ${Math.round(item.wind.speed)} mph</div>
      </div>
    `;
  }).join("");

  extendedOutlookHTML = buildExtendedOutlook(forecastData);

  document.getElementById("weatherResult").innerHTML = `
    <div class="current-weather-card">
      <div class="current-left">
        <div class="current-icon">${currentIcon}</div>
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

    <div class="note-card">
      <div class="note-icon">💬</div>
      <div>
        <h3>Weatherman’s Note</h3>
        <p>${getWeatherNote(temp, wind, description)}</p>
      </div>
    </div>

    <div class="advice-card">
      <div class="advice-icon">🧭</div>
      <div>
        <h3>Today’s Simple Guidance</h3>
        <p>${getPlainEnglishGuidance(temp, wind, description)}</p>
      </div>
    </div>

    <div class="quick-grid">
      <div class="quick-card">
        <div class="quick-icon">🚗</div>
        <h3>Vehicle Prep</h3>
        <p>${getVehicleTip(temp, wind, description)}</p>
      </div>

      <div class="quick-card">
        <div class="quick-icon">🏠</div>
        <h3>Home Readiness</h3>
        <p>${getHomeTip(temp, wind, description)}</p>
      </div>

      <div class="quick-card">
        <div class="quick-icon">🌳</div>
        <h3>Outdoor Comfort</h3>
        <p>${getOutdoorTip(temp, wind, description)}</p>
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

    <div class="forecast-heading">
      <h2>Your Day Ahead</h2>
      <p>Forecast updates in 3-hour intervals.</p>
    </div>

    <div class="forecast-grid">
      ${forecastCards}
    </div>

    <div class="extended-toggle-wrap">
      <button class="extended-btn" onclick="toggleExtendedOutlook()">Show Extended Outlook</button>
    </div>

    <div id="extendedOutlook" class="extended-outlook"></div>
  `;
}

function buildExtendedOutlook(forecastData) {
  const daily = {};

  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const key = date.toLocaleDateString();

    if (!daily[key]) {
      daily[key] = {
        day: date.toLocaleDateString([], { weekday: "short" }),
        temps: [],
        condition: item.weather[0].main,
        description: item.weather[0].description
      };
    }

    daily[key].temps.push(item.main.temp);
  });

  return Object.values(daily).slice(0, 5).map(day => {
    const high = Math.round(Math.max(...day.temps));
    const low = Math.round(Math.min(...day.temps));

    return `
      <div class="forecast-card extended-card">
        <div class="forecast-day">${day.day}</div>
        <div class="forecast-icon">${getWeatherIcon(day.condition)}</div>
        <div class="forecast-temp">${high}° / ${low}°</div>
        <div class="forecast-desc">${day.description}</div>
      </div>
    `;
  }).join("");
}

function toggleExtendedOutlook() {
  const container = document.getElementById("extendedOutlook");

  if (container.innerHTML.trim()) {
    container.innerHTML = "";
  } else {
    container.innerHTML = `
      <div class="forecast-heading extended-heading">
        <h2>Extended Outlook</h2>
        <p>A simple multi-day look based on available forecast data.</p>
      </div>
      <div class="forecast-grid">${extendedOutlookHTML}</div>
    `;
  }
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
  if (temp >= 90) return "It’s a hot one. Shade, water, and a little common sense go a long way.";
  if (temp <= 35) return "Bundle up. This is the kind of cold that sneaks into your sleeves.";
  if (wind >= 20) return "Hold onto your hat — it’s breezier than it may look.";
  if (text.includes("clear")) return "Pretty nice setup today. A good day to enjoy the sky.";
  if (text.includes("cloud")) return "A little gray, but not necessarily gloomy. Keep an eye on changes.";

  return "Nothing too dramatic right now. A good day to check the forecast before heading out.";
}

function getPlainEnglishGuidance(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("thunder") || text.includes("storm")) return "Storms may be nearby. Keep an eye on changing conditions and avoid being outside if thunder develops.";
  if (text.includes("rain")) return "Rain is in the forecast window. Give yourself extra drive time and watch for slick roads.";
  if (wind >= 20) return "It may feel breezy. Secure lightweight outdoor items and expect stronger gusts while driving.";
  if (temp >= 90) return "It is hot today. Stay hydrated, limit long outdoor stretches, and check on pets or anyone sensitive to heat.";
  if (temp <= 35) return "Cold conditions are in place. Dress in layers and watch for slick spots if moisture is nearby.";

  return "Conditions look manageable right now. Use the forecast below to plan the rest of your day.";
}

function getVehicleTip(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("rain") || text.includes("storm")) return "Allow extra stopping distance and check wipers before heading out.";
  if (temp >= 90) return "Heat can be hard on tires and batteries. Avoid leaving pets, drinks, or electronics in the car.";
  if (temp <= 35) return "Cold weather can affect tire pressure and battery strength. Give the car a little extra time.";
  if (wind >= 20) return "Expect stronger gusts on highways, bridges, and open roads.";

  return "Driving conditions look generally manageable right now.";
}

function getHomeTip(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("storm") || wind >= 20) return "Secure lightweight outdoor items like chairs, umbrellas, trash cans, and yard décor.";
  if (text.includes("rain")) return "Good time to check gutters, low spots, and anything outside that should stay dry.";
  if (temp >= 90) return "Close blinds during peak sun and check that pets have shade and water.";
  if (temp <= 35) return "Watch outdoor faucets, plants, and exposed pipes if temperatures keep dropping.";

  return "No major home concerns right now based on current conditions.";
}

function getOutdoorTip(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("rain") || text.includes("storm")) return "Outdoor plans may need a backup option. Keep an eye on the next few forecast windows.";
  if (temp >= 90) return "Plan outdoor activity earlier or later in the day and take water breaks.";
  if (temp <= 35) return "Dress warmly and limit long outdoor exposure.";
  if (wind >= 20) return "It may feel windier than expected, especially in open areas.";

  return "Outdoor conditions look reasonable right now.";
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

function openContactForm() {
  document.getElementById("contactModal").classList.add("active");
}

function closeContactForm() {
  document.getElementById("contactModal").classList.remove("active");
}
