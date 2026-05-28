const form = document.getElementById('weatherForm');
const input = document.getElementById('locationInput');
const geoButton = document.getElementById('geoButton');
const year = document.getElementById('year');
year.textContent = new Date().getFullYear();

const els = {
  placeName: document.getElementById('placeName'),
  currentTemp: document.getElementById('currentTemp'),
  currentSummary: document.getElementById('currentSummary'),
  todayTitle: document.getElementById('todayTitle'),
  todayText: document.getElementById('todayText'),
  hourlyStrip: document.getElementById('hourlyStrip'),
  alertsList: document.getElementById('alertsList'),
  outdoorGuidance: document.getElementById('outdoorGuidance'),
  driveGuidance: document.getElementById('driveGuidance'),
  prepGuidance: document.getElementById('prepGuidance')
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  setLoading(q);
  try {
    const point = await geocode(q);
    await loadWeather(point.lat, point.lon, point.name);
  } catch (err) {
    showError(err.message || 'Something went wrong. Try another city or ZIP.');
  }
});

geoButton.addEventListener('click', () => {
  if (!navigator.geolocation) return showError('Your browser does not support location lookup.');
  setLoading('your location');
  navigator.geolocation.getCurrentPosition(
    async pos => loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your Location').catch(err => showError(err.message)),
    () => showError('Location access was blocked. Try entering a city or ZIP.')
  );
});

async function geocode(query) {
  // Lightweight geocoder using OpenStreetMap Nominatim. For a production version, we can replace this with a dedicated geocoding service.
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
  const data = await res.json();
  if (!data.length) throw new Error('I could not find that location. Try city + state or a ZIP code.');
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].display_name.split(',').slice(0,2).join(',') };
}

async function loadWeather(lat, lon, name) {
  const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: nwsHeaders() });
  if (!pointsRes.ok) throw new Error('NWS could not return weather for that location.');
  const points = await pointsRes.json();
  const { forecast, forecastHourly, observationStations, county } = points.properties;

  const [daily, hourly, stationList] = await Promise.all([
    fetch(forecast, { headers: nwsHeaders() }).then(r => r.json()),
    fetch(forecastHourly, { headers: nwsHeaders() }).then(r => r.json()),
    fetch(observationStations, { headers: nwsHeaders() }).then(r => r.json())
  ]);

  let observation = null;
  const firstStation = stationList.features?.[0]?.properties?.stationIdentifier;
  if (firstStation) {
    const obsRes = await fetch(`https://api.weather.gov/stations/${firstStation}/observations/latest`, { headers: nwsHeaders() });
    if (obsRes.ok) observation = await obsRes.json();
  }

  const currentTemp = observation?.properties?.temperature?.value;
  const tempF = currentTemp === null || currentTemp === undefined ? hourly.properties.periods[0].temperature : Math.round(currentTemp * 9/5 + 32);
  const today = daily.properties.periods[0];
  const hours = hourly.properties.periods.slice(0, 8);

  els.placeName.textContent = name;
  els.currentTemp.textContent = `${tempF}°`;
  els.currentSummary.textContent = today.shortForecast || 'Current conditions loaded.';
  els.todayTitle.textContent = today.name || 'Today';
  els.todayText.textContent = today.detailedForecast || today.shortForecast;
  renderHourly(hours);
  renderGuidance(today, hours);
  loadAlerts(county);
}

function renderHourly(hours) {
  els.hourlyStrip.innerHTML = hours.map(h => `
    <article class="hour-card">
      <span>${new Date(h.startTime).toLocaleTimeString([], { hour: 'numeric' })}</span>
      <strong>${h.temperature}°</strong>
      <p>${h.shortForecast}</p>
    </article>
  `).join('');
}

function renderGuidance(today, hours) {
  const text = `${today.shortForecast} ${today.detailedForecast}`.toLowerCase();
  const storm = /storm|thunder|hail|tornado|severe/.test(text);
  const rain = /rain|shower/.test(text);
  const wind = /wind|gust/.test(text);
  const hot = hours.some(h => h.temperature >= 90);

  els.outdoorGuidance.textContent = storm ? 'Keep plans flexible. Storms are possible, so watch timing before outdoor activities.' : rain ? 'Outdoor plans may still work, but keep rain timing in mind.' : hot ? 'Hydrate and plan breaks. Heat may be the bigger issue today.' : 'A relatively manageable setup for outdoor plans based on the current forecast.';
  els.driveGuidance.textContent = wind ? 'Expect wind to be a factor, especially on open roads and highways.' : rain || storm ? 'Allow extra drive time if roads become wet or visibility drops.' : 'No major driving concerns showing from this forecast right now.';
  els.prepGuidance.textContent = storm ? 'Secure loose outdoor items and consider covered parking if stronger storms develop.' : wind ? 'Bring in lightweight outdoor items if gusts increase.' : 'No urgent property prep showing right now. Check back if conditions change.';
}

async function loadAlerts(countyUrl) {
  if (!countyUrl) return;
  const zone = countyUrl.split('/').pop();
  const res = await fetch(`https://api.weather.gov/alerts/active/zone/${zone}`, { headers: nwsHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  if (!data.features.length) {
    els.alertsList.innerHTML = '<p class="muted">No active NWS alerts for this area right now.</p>';
    return;
  }
  els.alertsList.innerHTML = data.features.map(a => `
    <article class="alert-card">
      <h3>${a.properties.event}</h3>
      <p>${a.properties.headline || a.properties.description}</p>
    </article>
  `).join('');
}

function nwsHeaders() {
  return { 'Accept': 'application/geo+json' };
}

function setLoading(place) {
  els.placeName.textContent = `Checking ${place}...`;
  els.currentTemp.textContent = '--°';
  els.currentSummary.textContent = 'Pulling NOAA / NWS data now.';
}

function showError(message) {
  els.placeName.textContent = 'Try another location';
  els.currentSummary.textContent = message;
}
