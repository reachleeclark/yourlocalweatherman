const apiKey = "1d580865d7039710695991aae9a625f6";

async function getWeather() {

  const query =
    document.getElementById("cityInput").value.trim();

  if (!query) {
    showMessage(
      "Please enter a location.",
      "Example: 67217 or Wichita, KS"
    );
    return;
  }

  try {

    let currentUrl;
    let forecastUrl;

    if (/^\d{5}$/.test(query)) {

      currentUrl =
        `https://api.openweathermap.org/data/2.5/weather?zip=${query},US&units=imperial&appid=${apiKey}`;

      forecastUrl =
        `https://api.openweathermap.org/data/2.5/forecast?zip=${query},US&units=imperial&appid=${apiKey}`;

    } else {

      currentUrl =
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=imperial&appid=${apiKey}`;

      forecastUrl =
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&units=imperial&appid=${apiKey}`;

    }

    loadWeather(currentUrl, forecastUrl);

  } catch {

    showMessage(
      "Unable to find that location.",
      "Try ZIP, city, or city/state."
    );

  }

}

function getWeatherByLocation() {

  if (!navigator.geolocation) {

    showMessage(
      "Location not supported.",
      "Please enter a ZIP or city."
    );

    return;
  }

  navigator.geolocation.getCurrentPosition(position => {

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const currentUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

    const forecastUrl =
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

    loadWeather(currentUrl, forecastUrl);

  });

}

async function loadWeather(currentUrl, forecastUrl) {

  try {

    const currentResponse =
      await fetch(currentUrl);

    const forecastResponse =
      await fetch(forecastUrl);

    const currentData =
      await currentResponse.json();

    const forecastData =
      await forecastResponse.json();

    const temp =
      Math.round(currentData.main.temp);

    const feelsLike =
      Math.round(currentData.main.feels_like);

    const humidity =
      currentData.main.humidity;

    const wind =
      Math.round(currentData.wind.speed);

    const description =
      currentData.weather[0].description;

    const currentIcon =
      getWeatherIcon(currentData.weather[0].main);

    const sunrise =
      formatTime(currentData.sys.sunrise);

    const sunset =
      formatTime(currentData.sys.sunset);

    const note =
      getWeatherNote(temp, wind, description);

    const forecastCards =
      forecastData.list.slice(0, 8).map(item => {

        const date =
          new Date(item.dt * 1000);

        return `
          <div class="forecast-card">

            <div class="forecast-day">
              ${date.toLocaleDateString([], {
                weekday: "short"
              })}
            </div>

            <div class="forecast-time">
              ${date.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
              })}
            </div>

            <div class="forecast-icon">
              ${getWeatherIcon(item.weather[0].main)}
            </div>

            <div class="forecast-temp">
              ${Math.round(item.main.temp)}°F
            </div>

            <div class="forecast-desc">
              ${item.weather[0].description}
            </div>

          </div>
        `;

      }).join("");

    document.getElementById("weatherResult").innerHTML = `

      <div class="current-weather-card">

        <div class="current-left">

          <div class="current-icon">
            ${currentIcon}
          </div>

          <div>

            <h2>
              ${currentData.name}
            </h2>

            <p class="weather-desc">
              ${description}
            </p>

          </div>

        </div>

        <div class="current-temp">
          ${temp}°F
        </div>

        <div class="weather-stats">

          <div>
            <span>Feels Like</span>
            <strong>${feelsLike}°F</strong>
          </div>

          <div>
            <span>Humidity</span>
            <strong>${humidity}%</strong>
          </div>

          <div>
            <span>Wind</span>
            <strong>${wind} mph</strong>
          </div>

        </div>

      </div>

      <div class="note-card">

        <div class="note-icon">💬</div>

        <div>

          <h3>Weatherman’s Note</h3>

          <p>${note}</p>

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

            <strong>Good</strong>

          </div>

        </div>

      </div>

      <div class="forecast-heading">

        <h2>Your Day Ahead</h2>

        <p>
          Forecast updates in 3-hour intervals.
        </p>

      </div>

      <div class="forecast-grid">
        ${forecastCards}
      </div>

    `;

  } catch {

    showMessage(
      "Unable to retrieve weather data.",
      "Please try again."
    );

  }

}

function getWeatherIcon(condition) {

  if (condition.includes("Thunder")) return "⛈️";
  if (condition.includes("Rain")) return "🌧️";
  if (condition.includes("Drizzle")) return "🌦️";
  if (condition.includes("Snow")) return "❄️";
  if (condition.includes("Cloud")) return "☁️";
  if (condition.includes("Clear")) return "☀️";

  return "🌤️";
}

function getWeatherNote(temp, wind, description) {

  const text =
    description.toLowerCase();

  if (text.includes("rain"))
    return "Grab the galoshes — it’s wet out there.";

  if (text.includes("storm"))
    return "Keep one eye on the sky today.";

  if (temp >= 90)
    return "It’s a hot one. Shade and water go a long way.";

  if (temp <= 35)
    return "Bundle up. This cold sneaks up on you.";

  if (wind >= 20)
    return "Hold onto your hat — it’s breezy.";

  return "Nothing too dramatic right now.";
}

function formatTime(timestamp) {

  return new Date(timestamp * 1000)
    .toLocaleTimeString([], {
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
  document.getElementById("contactModal")
    .classList.add("active");
}

function closeContactForm() {
  document.getElementById("contactModal")
    .classList.remove("active");
}
