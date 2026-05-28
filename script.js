async function getWeather() {
  const zip = document.getElementById("cityInput").value.trim();
  const apiKey = "1d580865d7039710695991aae9a625f6";

  if (!zip) {
    document.getElementById("weatherResult").innerHTML = `
      <div class="welcome-card">
        <h2>Please enter a ZIP code.</h2>
        <p>Example: 67217</p>
      </div>
    `;
    return;
  }

  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather?zip=${zip},US&units=imperial&appid=${apiKey}`;

  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast?zip=${zip},US&units=imperial&appid=${apiKey}`;

  try {
    const currentResponse = await fetch(currentUrl);
    const forecastResponse = await fetch(forecastUrl);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error("Weather not found");
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    const currentIcon = getWeatherIcon(currentData.weather[0].main);
    const temp = Math.round(currentData.main.temp);
    const feelsLike = Math.round(currentData.main.feels_like);
    const wind = Math.round(currentData.wind.speed);
    const description = currentData.weather[0].description;

    const forecastCards = forecastData.list.slice(0, 8).map(item => {
      const date = new Date(item.dt * 1000);

      const time = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });

      const day = date.toLocaleDateString([], {
        weekday: "short"
      });

      const icon = getWeatherIcon(item.weather[0].main);

      return `
        <div class="forecast-card">
          <div class="forecast-day">${day}</div>
          <div class="forecast-time">${time}</div>
          <div class="forecast-icon">${icon}</div>
          <div class="forecast-temp">${Math.round(item.main.temp)}°F</div>
          <div class="forecast-desc">${item.weather[0].description}</div>
          <div class="forecast-detail">Wind: ${Math.round(item.wind.speed)} mph</div>
        </div>
      `;
    }).join("");

    const guidance = getPlainEnglishGuidance(temp, wind, description);

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
          <div>
            <span>Feels Like</span>
            <strong>${feelsLike}°F</strong>
          </div>
          <div>
            <span>Humidity</span>
            <strong>${currentData.main.humidity}%</strong>
          </div>
          <div>
            <span>Wind</span>
            <strong>${wind} mph</strong>
          </div>
        </div>
      </div>

      <div class="advice-card">
        <div class="advice-icon">🧭</div>
        <div>
          <h3>Today’s Simple Guidance</h3>
          <p>${guidance}</p>
        </div>
      </div>

      <h2 class="section-title">Next Forecast Windows</h2>
      <p class="section-subtitle">Forecast data updates in 3-hour windows.</p>

      <div class="forecast-grid">
        ${forecastCards}
      </div>
    `;

  } catch (error) {
    document.getElementById("weatherResult").innerHTML = `
      <div class="welcome-card">
        <h2>Unable to retrieve weather data.</h2>
        <p>Please check the ZIP code and try again.</p>
      </div>
    `;
  }
}

function getWeatherIcon(condition) {
  if (condition.includes("Cloud")) return "☁️";
  if (condition.includes("Rain")) return "🌧️";
  if (condition.includes("Thunder")) return "⛈️";
  if (condition.includes("Snow")) return "❄️";
  if (condition.includes("Mist") || condition.includes("Fog") || condition.includes("Haze")) return "🌫️";
  if (condition.includes("Clear")) return "☀️";
  return "🌤️";
}

function getPlainEnglishGuidance(temp, wind, description) {
  const lower = description.toLowerCase();

  if (lower.includes("rain") || lower.includes("storm")) {
    return "Keep an umbrella handy and give yourself extra time on the road. Roads may be slick in spots.";
  }

  if (wind >= 20) {
    return "It may feel breezy today. Secure lightweight outdoor items and expect stronger gusts while driving.";
  }

  if (temp >= 90) {
    return "It is warm today. Stay hydrated, limit long outdoor stretches, and check on pets or anyone sensitive to heat.";
  }

  if (temp <= 35) {
    return "Cold conditions are in place. Dress in layers and watch for slick spots if moisture is nearby.";
  }

  if (lower.includes("cloud")) {
    return "A fairly calm day overall, with clouds around. Good day to keep an eye on changes, but no major concern right now.";
  }

  return "Conditions look manageable right now. Check the next forecast windows below before making outdoor plans.";
}
