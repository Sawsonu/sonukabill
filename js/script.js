<html>
    <script>
    let currentMeter = "neeche";

const defaultLastReadings = {
  neeche: 17099,
  uper: 3690
};

const thresholds = [
  { limit: 25, message: "Low usage — good job saving energy!", color: "green" },
  { limit: 50, message: "Moderate usage — watch your consumption.", color: "green" },
  { limit: 75, message: "High usage — try to reduce.", color: "orange" },
  { limit: 90, message: "Very high usage — consider energy-saving appliances.", color: "red" },
  { limit: 100, message: "Extreme usage — urgent action needed to save energy!", color: "red" }
];

const tariffSlabs = [
  { upto: 100, rate: 4.71 },
  { upto: 300, rate: 10.29 },
  { upto: Infinity, rate: 14.55 }
];

const themes = ["light-mode", "dark-mode", "neon-mode"];
const emojis = ["☀️", "🌙", "💡"];
let themeIndex = parseInt(localStorage.getItem("themeIndex")) || 0;

function switchMeter() {
  currentMeter = document.getElementById("meterSelect").value;
  loadLastReading();
  renderHistory();
  document.getElementById("result").innerHTML = "Your bill details will appear here.";
  clearMessage();
}

function getKey(name) {
  return `${currentMeter}_${name}`;
}

function loadLastReading() {
  const savedLast = localStorage.getItem(getKey("lastReading"));
  const lastReading = (savedLast && savedLast.length >= 4 && Number(savedLast) > 1000)
    ? Number(savedLast)
    : defaultLastReadings[currentMeter];

  document.getElementById("lastReading").value = lastReading;
  document.getElementById("currentReading").value = Math.floor(lastReading / 100);
}

function resetInputs() {
  document.getElementById("lastReading").value = '';
  document.getElementById("currentReading").value = '';
  document.getElementById("result").innerHTML = 'Your bill details will appear here.';
  clearMessage();
}

function calculateEnergy(units) {
  let remaining = units, energy = 0, prevLimit = 0;
  for (let slab of tariffSlabs) {
    const slabUnits = Math.min(remaining, slab.upto - prevLimit);
    energy += slabUnits * slab.rate;
    remaining -= slabUnits;
    prevLimit = slab.upto;
    if (remaining <= 0) break;
  }
  return energy;
}

function calculateTotal(energy, units) {
  const fixed = 138, wheelingRate = 1.17;
  const wheeling = units * wheelingRate;
  const dutyAmt = (energy + fixed + wheeling) * 0.16;
  return { fixed, wheeling, dutyAmt, total: energy + fixed + wheeling + dutyAmt };
}

function getWarning(units) {
  if (units > 200) {
    alert("⚠️ Very high usage detected. Something is likely wrong or needs checking.");
    return { message: "⚠️ Unusual usage. Check readings or wiring.", color: "red" };
  }
  return thresholds.find(t => units <= t.limit) || thresholds[thresholds.length - 1];
}

function calculateBill() {
  clearMessage();
  const last = parseFloat(document.getElementById("lastReading").value);
  const curr = parseFloat(document.getElementById("currentReading").value);
  const msg = document.getElementById("saveMessage");

  if (isNaN(last) || isNaN(curr) || last < 0 || curr < 0) {
    msg.style.color = "red";
    msg.textContent = "Please enter valid numeric readings.";
    return;
  }
  if (curr < last) {
    msg.style.color = "red";
    msg.textContent = "⚠️ Current reading must be greater than or equal to last month's reading.";
    return;
  }

  const units = curr - last;
  const energy = calculateEnergy(units);
  const charges = calculateTotal(energy, units);
  const warning = getWarning(units);

  const today = new Date();
  const next12th = new Date(today.getFullYear(), today.getMonth(), 12);
  if (today.getDate() > 12) next12th.setMonth(next12th.getMonth() + 1);
  const daysLeft = Math.ceil((next12th - today) / (1000 * 60 * 60 * 24));

  let billCountdownRow = "";
  if (daysLeft < 5) {
    const urgencyClass = daysLeft <= 2 ? "very-urgent" : "urgent";
    const billCountdown = `${daysLeft} more day${daysLeft !== 1 ? 's' : ''} left for bill generation`;
    billCountdownRow = `<tr><td colspan="2" class="billCountdown ${urgencyClass}">${billCountdown}</td></tr>`;
  }

  const table = `
    <table>
      <tr><th>Description</th><th>₹</th></tr>
      <tr><td>Units Used</td><td>${units.toFixed(2)}</td></tr>
      <tr><td>Energy Charge</td><td>${energy.toFixed(2)}</td></tr>
      <tr><td>Wheeling Charge</td><td>${charges.wheeling.toFixed(2)}</td></tr>
      <tr><td>Fixed Charge</td><td>${charges.fixed.toFixed(2)}</td></tr>
      <tr><td>Electricity Duty (16%)</td><td>${charges.dutyAmt.toFixed(2)}</td></tr>
      <tr><td><strong>Total</strong></td><td><strong>₹${charges.total.toFixed(2)}</strong></td></tr>
      <tr><td colspan="2" class="warning ${warning.color}">${warning.message}</td></tr>
      ${billCountdownRow}
    </table>`;
  document.getElementById("result").innerHTML = table;

  saveToHistory(units, charges.total);
}

function saveToHistory(units, total) {
  const key = getKey("billHistory");
  const prev = JSON.parse(localStorage.getItem(key)) || [];
  prev.push({ date: new Date().toLocaleString(), units, total });
  localStorage.setItem(key, JSON.stringify(prev));
  renderHistory();
}

function renderHistory() {
  const key = getKey("billHistory");
  const hist = JSON.parse(localStorage.getItem(key)) || [];
  const box = document.getElementById("history");
  if (!hist.length) {
    box.innerHTML = "No previous bills yet.";
    return;
  }
  let html = `<h3>History (${currentMeter === "neeche" ? "Neeche Ghar" : "Uper Ghar"})</h3>
    <table><tr><th>Date</th><th>Units</th><th>Total</th></tr>`;
  hist.slice(-5).reverse().forEach(e => {
    html += `<tr><td>${e.date}</td><td>${e.units.toFixed(2)}</td><td>₹${e.total.toFixed(2)}</td></tr>`;
  });
  html += "</table>";
  box.innerHTML = html;
}

function clearHistory() {
  if (confirm("Clear history for this meter?")) {
    localStorage.removeItem(getKey("billHistory"));
    renderHistory();
  }
}

function clearMessage() {
  document.getElementById("saveMessage").textContent = "";
}

function applyTheme(index) {
  document.body.classList.remove(...themes);
  document.body.classList.add(themes[index]);
  document.getElementById("theme-toggle").textContent = emojis[index];
  localStorage.setItem("themeIndex", index);
}

function cycleTheme() {
  themeIndex = (themeIndex + 1) % themes.length;
  applyTheme(themeIndex);
}

window.onload = function () {
  currentMeter = document.getElementById("meterSelect").value;
  applyTheme(themeIndex);
  loadLastReading();
  renderHistory();
};

    </script>
</html>
    
