async function getWeather() {

  const city = document.getElementById("cityInput").value;

  const apiKey = "1d580865d7039710695991aae9a625f6";

  const url =
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;

  try {

    const response = await fetch(url);

    const data = await response.json();

    const weatherMain = data.weather[0].main;

    let icon = "☀️";

    if(weatherMain.includes("Cloud")) icon = "☁️";
    if(weatherMain.includes("Rain")) icon = "🌧️";
    if(weatherMain.includes("Thunder")) icon = "⛈️";
    if(weatherMain.includes("Snow")) icon = "❄️";

    document.getElementById("weatherResult").innerHTML = `

      <div class="weather-card">

        <div class="weather-icon">${icon}</div>

        <h3>${data.name}</h3>

        <p><strong>${Math.round(data.main.temp)}°F</strong></p>

        <p>${data.weather[0].description}</p>

        <p>Humidity: ${data.main.humidity}%</p>

        <p>Wind: ${data.wind.speed} mph</p>

      </div>

    `;

  } catch(error) {

    document.getElementById("weatherResult").innerHTML =
      `<p>Unable to retrieve weather data.</p>`;

  }

}
