async function getWeather() {
  const zip = document.getElementById("cityInput").value.trim();
  const apiKey = "1d580865d7039710695991aae9a625f6";

  if (!zip) {
    document.getElementById("weatherResult").innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon">⚠️</div>
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

    const temp = Math.round(currentData.main.temp);
    const feelsLike = Math.round(currentData.main.feels_like);
    const humidity = currentData.main.humidity;
    const wind = Math.round(currentData.wind.speed);
    const description = currentData.weather[0].description;
    const condition = currentData.weather[0].main;
    const currentIcon = getWeatherIcon(condition);

    const forecastCards = forecastData.list.slice(0, 8).map(item => {
      const date = new Date(item.dt * 1000);

      const day = date.toLocaleDateString([], {
        weekday: "short"
      });

      const time = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });

      const itemCondition = item.weather[0].main;
      const itemIcon = getWeatherIcon(itemCondition);

      return `
        <div class="forecast-card">
          <div class="forecast-day">${day}</div>
          <div class="forecast-time">${time}</div>
          <div class="forecast-icon">${itemIcon}</div>
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
            <strong>${humidity}%</strong>
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

      <div class="forecast-heading">
        <h2>Next Forecast Windows</h2>
        <p>OpenWeather’s free forecast updates in 3-hour blocks.</p>
      </div>

      <div class="forecast-grid">
        ${forecastCards}
      </div>
    `;

  } catch (error) {
    document.getElementById("weatherResult").innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon">⚠️</div>
        <h2>Unable to retrieve weather data.</h2>
        <p>Please check the ZIP code and try again.</p>
      </div>
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

function getPlainEnglishGuidance(temp, wind, description) {
  const text = description.toLowerCase();

  if (text.includes("thunder") || text.includes("storm")) {
    return "Storms may be nearby. Keep an eye on changing conditions and avoid being outside if thunder develops.";
  }

  if (text.includes("rain")) {
    return "Rain is in the forecast window. Give yourself extra drive time and watch for slick roads.";
  }

  if (wind >= 20) {
    return "It may feel breezy. Secure lightweight outdoor items and expect stronger gusts while driving.";
  }

  if (temp >= 90) {
    return "It is hot today. Stay hydrated, limit long outdoor stretches, and check on pets or anyone sensitive to heat.";
  }

  if (temp <= 35) {
    return "Cold conditions are in place. Dress in layers and watch for slick spots if moisture is nearby.";
  }

  if (text.includes("cloud")) {
    return "Clouds are around, but conditions look manageable right now. Check the forecast windows before outdoor plans.";
  }

  return "Conditions look manageable right now. Use the next forecast windows below to plan the rest of your day.";
}
