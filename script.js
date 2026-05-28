async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  const apiKey = "1d580865d7039710695991aae9a625f6";

  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather?zip=${city},US&units=imperial&appid=${apiKey}`;

  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast?zip=${city},US&units=imperial&appid=${apiKey}`;

  try {
    const currentResponse = await fetch(currentUrl);
    const forecastResponse = await fetch(forecastUrl);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error("Weather not found");
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    const weatherMain = currentData.weather[0].main;

    let icon = "☀️";
    if (weatherMain.includes("Cloud")) icon = "☁️";
    if (weatherMain.includes("Rain")) icon = "🌧️";
    if (weatherMain.includes("Thunder")) icon = "⛈️";
    if (weatherMain.includes("Snow")) icon = "❄️";
    if (weatherMain.includes("Clear")) icon = "☀️";

    const hourlyCards = forecastData.list.slice(0, 8).map(item => {
      const time = new Date(item.dt * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });

      return `
        <div class="hour-card">
          <p><strong>${time}</strong></p>
          <p>${Math.round(item.main.temp)}°F</p>
          <p>${item.weather[0].description}</p>
          <p>Wind: ${Math.round(item.wind.speed)} mph</p>
        </div>
      `;
    }).join("");

    document.getElementById("weatherResult").innerHTML = `
      <div class="weather-card">
        <div class="weather-icon">${icon}</div>
        <h3>${currentData.name}</h3>
        <p><strong>${Math.round(currentData.main.temp)}°F</strong></p>
        <p>${currentData.weather[0].description}</p>
        <p>Humidity: ${currentData.main.humidity}%</p>
        <p>Wind: ${Math.round(currentData.wind.speed)} mph</p>
      </div>

      <h2 class="section-title">Hourly Forecast</h2>

      <div class="hourly-grid">
        ${hourlyCards}
      </div>
    `;

  } catch (error) {
    document.getElementById("weatherResult").innerHTML = `
      <div class="weather-card">
        <h3>Unable to retrieve weather data.</h3>
        <p>Please try another ZIP code.</p>
      </div>
    `;
  }
}
