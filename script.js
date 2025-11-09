// ===========================
// CURRENCY CONVERTER APP (script.js)
// ===========================

// Currency data with flags
const currencies = {
  'USD': { name: 'US Dollar', flag: 'US', symbol: '$' },
  'EUR': { name: 'Euro', flag: 'DE', symbol: '€' },
  'GBP': { name: 'British Pound', flag: 'GB', symbol: '£' },
  'INR': { name: 'Indian Rupee', flag: 'IN', symbol: '₹' },
  'JPY': { name: 'Japanese Yen', flag: 'JP', symbol: '¥' },
  'AUD': { name: 'Australian Dollar', flag: 'AU', symbol: 'A$' },
  'CAD': { name: 'Canadian Dollar', flag: 'CA', symbol: 'C$' },
  'CHF': { name: 'Swiss Franc', flag: 'CH', symbol: 'CHF' },
  'CNY': { name: 'Chinese Yuan', flag: 'CN', symbol: '¥' },
  'NZD': { name: 'New Zealand Dollar', flag: 'NZ', symbol: 'NZ$' },
  'SGD': { name: 'Singapore Dollar', flag: 'SG', symbol: 'S$' },
  'BRL': { name: 'Brazilian Real', flag: 'BR', symbol: 'R$' }
};

// DOM Elements
const amountInput = document.getElementById('amount');
const fromCurrency = document.getElementById('fromCurrency');
const toCurrency = document.getElementById('toCurrency');
const fromFlag = document.getElementById('fromFlag');
const toFlag = document.getElementById('toFlag');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const resultCard = document.getElementById('resultCard');
const resultValue = document.getElementById('resultValue');
const exchangeRate = document.getElementById('exchangeRate');
const updateTime = document.getElementById('updateTime');
const swapBtn = document.getElementById('swapBtn');
const historyList = document.getElementById('historyList');
const clearHistory = document.getElementById('clearHistory');
const chartCard = document.getElementById('chartCard');
const voiceStatus = document.getElementById('voiceStatus');

// State
let conversionHistory = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
let chart = null;

// ===========================
// INITIALIZATION
// ===========================
function init() {
  populateCurrencyDropdowns();
  renderHistory();
  setupEventListeners();
  // ❌ Removed auto-convert on page load
}

function populateCurrencyDropdowns() {
  Object.keys(currencies).forEach(code => {
    const opt1 = document.createElement('option');
    opt1.value = code;
    opt1.textContent = `${code} - ${currencies[code].name}`;
    fromCurrency.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = code;
    opt2.textContent = `${code} - ${currencies[code].name}`;
    toCurrency.appendChild(opt2);
  });

  fromCurrency.value = 'USD';
  toCurrency.value = 'INR';
  updateFlags();
}

// ===========================
// FLAGS
// ===========================
function setFlag(img, code) {
  img.onerror = () => { img.src = 'https://via.placeholder.com/64x64?text=?'; };
  img.src = `https://flagsapi.com/${code}/flat/64.png`;
}

function updateFlags() {
  setFlag(fromFlag, currencies[fromCurrency.value].flag);
  setFlag(toFlag, currencies[toCurrency.value].flag);
}

// ===========================
// CONVERSION LOGIC (Frankfurter API)
// ===========================
async function convertCurrency() {
  const amount = Number(amountInput.value);
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!Number.isFinite(amount) || amount <= 0) {
    showError("Please enter a valid amount");
    return;
  }

  showLoader(true);
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
    const data = await response.json();

    if (data.rates && data.rates[to]) {
      const converted = data.rates[to].toFixed(2);
      const rate = (data.rates[to] / amount).toFixed(4);

      resultValue.textContent = `${currencies[to].symbol}${parseFloat(converted).toLocaleString()}`;
      exchangeRate.textContent = `1 ${from} = ${rate} ${to}`;
      updateTime.textContent = new Date().toLocaleTimeString();
      resultCard.classList.remove("hidden");

      addToHistory(amount, from, to, converted, rate);
      fetchHistoricalData(from, to);
    } else {
      showError("Conversion failed. Please try again.");
    }
  } catch (error) {
    console.error("Error:", error);
    showError("Network error. Please check your connection.");
  } finally {
    showLoader(false);
  }
}

// ===========================
// HISTORICAL CHART (7 days)
// ===========================
async function fetchHistoricalData(from, to) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const fmt = d => d.toISOString().split("T")[0];

  try {
    const response = await fetch(`https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=${from}&to=${to}`);
    const data = await response.json();
    if (data && data.rates) renderChart(data.rates, from, to);
  } catch (err) {
    console.error("Chart error:", err);
  }
}

function renderChart(rates, from, to) {
  const sortedDates = Object.keys(rates).sort((a, b) => new Date(a) - new Date(b));
  const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const values = sortedDates.map(d => rates[d][to]);

  if (chart) chart.destroy();
  const ctx = document.getElementById('trendChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { 
      labels, 
      datasets: [{
        label: `${from} to ${to}`,
        data: values,
        borderColor: 'rgb(99,102,241)',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true
      }] 
    },
    options: { responsive: true }
  });
}

// ===========================
// HISTORY
// ===========================
function addToHistory(amount, from, to, result, rate) {
  const entry = { amount, from, to, result, rate, timestamp: Date.now() };
  conversionHistory.unshift(entry);
  if (conversionHistory.length > 10) conversionHistory.pop();
  localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
  renderHistory();
}

function renderHistory() {
  if (conversionHistory.length === 0) {
    historyList.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No conversions yet</p>';
    return;
  }
  historyList.innerHTML = conversionHistory.map(entry => `
    <div class="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer">
      <div class="flex justify-between mb-1">
        <span class="text-sm font-semibold">${entry.amount} ${entry.from} → ${entry.to}</span>
        <span class="text-xs text-gray-400">${getRelativeTime(entry.timestamp)}</span>
      </div>
      <p class="text-lg font-bold text-indigo-600">${currencies[entry.to].symbol}${parseFloat(entry.result).toLocaleString()}</p>
      <p class="text-xs text-gray-500">1 ${entry.from} = ${entry.rate} ${entry.to}</p>
    </div>`).join('');
}

function getRelativeTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

clearHistory.addEventListener('click', () => {
  if (confirm('Clear all conversion history?')) {
    conversionHistory = [];
    localStorage.removeItem('conversionHistory');
    renderHistory();
  }
});

// ===========================
// EVENT LISTENERS
// ===========================
function setupEventListeners() {
  // Convert only when user clicks button or presses Enter
  convertBtn.addEventListener('click', convertCurrency);

  amountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') convertCurrency();
  });

  // Swap currencies manually
  swapBtn.addEventListener('click', () => {
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    updateFlags();
  });

  // Just update flags when currency dropdown changes (no auto-convert)
  fromCurrency.addEventListener('change', updateFlags);
  toCurrency.addEventListener('change', updateFlags);
}

// ===========================
// UTILITIES
// ===========================
function showLoader(show) {
  if (show) {
    // Keep the button width fixed to avoid shrinking
    convertBtn.style.width = convertBtn.offsetWidth + 'px';

    btnText.classList.add('invisible'); // invisible instead of hidden
    btnLoader.classList.remove('hidden');
    convertBtn.disabled = true;
  } else {
    btnText.classList.remove('invisible');
    btnLoader.classList.add('hidden');
    convertBtn.style.width = ''; // reset to normal width
    convertBtn.disabled = false;
  }
}


function showError(msg) {
  voiceStatus.textContent = msg;
  voiceStatus.style.color = '#ef4444';
  setTimeout(() => (voiceStatus.textContent = ''), 3000);
}

// ===========================
// START APP
// ===========================
init();
