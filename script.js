const apiKey = "1d580865d7039710695991aae9a625f6";
const contactAccessKey = "PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE";

const cityInput = document.getElementById("cityInput");
const locationSuggestions = document.getElementById("locationSuggestions");

let selectedLocation = null;

cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  selectedLocation = null;

  if (query.length < 2) return;

  try {
    let geoUrl;

    if (/^\d{5}$/.test(query)) {
      geoUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${query},US&appid=${apiKey}`;
      const response = await fetch(geoUrl);
      const data = await response.json();

      locationSuggestions.innerHTML = "";

      if (data.name) {
        const option = document.createElement("option");
        option.value = `${data.name}, ${data.country}`;
        option.dataset.lat = data.lat;
        option.dataset.lon = data.lon;
        locationSuggestions.appendChild(option);
      }

      return;
    }

    geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
    const response = await fetch(geoUrl);
    const data = await response.json();

    locationSuggestions.innerHTML = "";

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
    const currentUrl =
      `https://api.openweathermap.org/data/2.5/weather?zip=${query},US&units=imperial&appid=${apiKey}`;

    const forecastUrl =
      `https://api.openweathermap.org/data/2.5/forecast?zip=${query},US&units=imperial&appid=${apiKey}`;

    loadWeather(currentUrl, forecastUrl);
    return;
  }

  try {
    const geoUrl =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;

    const response = await fetch(geoUrl);
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
  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  loadWeather(currentUrl, forecastUrl);
}

async function loadWeather(currentUrl, forecastUrl) {
  try {
    document.getElementById("weatherResult").innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon">⏳</div>
        <h2>Loading your forecast...</h2>
        <p>Checking current conditions and forecast windows.</p>
      </div>
    `;

    const currentResponse = await fetch(currentUrl);
    const forecastResponse = await fetch(forecastUrl);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error("Weather not found");
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    const lat = currentData.coord.lat;
    const lon = currentData.coord.lon;

    let airData = null;

    try {
      const airResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
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
  const currentIcon = getWeatherIcon(currentData.weather[0].main);

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
      <div class="detail-card">
        <div class="detail-icon">🌅</div>
        <h3>Sunrise</h3>
        <strong>${sunrise}</strong>
      </div>

      <div class="detail-card">
        <div class="detail-icon">🌇</div>
        <h3>Sunset</h3>
        <strong>${sunset}</strong>
      </div>

      <div class="detail-card">
        <div class="detail-icon">🌬️</div>
        <h3>Air Quality</h3>
        <strong>${airQuality}</strong>
      </div>
    </div>

    <div class="forecast-heading">
      <h2>Next Forecast Windows</h2>
      <p>Forecast data updates in 3-hour blocks.</p>
    </div>

    <div class="forecast-grid">
      ${forecastCards}
    </div>
  `;
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

function getPlainEnglishGuidance(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("thunder") || text.includes("storm")) return "Storms may be nearby. Keep an eye on changing conditions and avoid being outside if thunder develops.";
  if (text.includes("rain")) return "Rain is in the forecast window. Give yourself extra drive time and watch for slick roads.";
  if (wind >= 20) return "It may feel breezy. Secure lightweight outdoor items and expect stronger gusts while driving.";
  if (temp >= 90) return "It is hot today. Stay hydrated, limit long outdoor stretches, and check on pets or anyone sensitive to heat.";
  if (temp <= 35) return "Cold conditions are in place. Dress in layers and watch for slick spots if moisture is nearby.";

  return "Conditions look manageable right now. Use the forecast windows below to plan the rest of your day.";
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

document.getElementById("contactForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const formStatus = document.getElementById("formStatus");

  if (contactAccessKey === "PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE") {
    formStatus.textContent = "Contact form needs a Web3Forms access key before it can send.";
    return;
  }

  const formData = new FormData(this);
  formData.append("access_key", contactAccessKey);
  formData.append("subject", "New message from Your Local Weatherman");

  formStatus.textContent = "Sending...";

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      formStatus.textContent = "Thanks! Your message has been sent.";
      this.reset();
    } else {
      formStatus.textContent = "Something went wrong. Please try again.";
    }

  } catch {
    formStatus.textContent = "Unable to send message right now.";
  }
});
