const axios = require('axios');
const port = 3000;
const interval = 200;
const baseUrl = `http://0.0.0.0:${port}/return-status`;
const statusCodes = [200, 300, 400, 500];

// Track statistics
const stats = {
  total: 0,
  success: 0,
  failure: 0,
  history: []
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function getStatusColor(code) {
  if (code < 300) return colors.green;
  if (code < 400) return colors.cyan;
  if (code < 500) return colors.yellow;
  return colors.red;
}

function renderDashboard() {
  // Move cursor to beginning
  process.stdout.write('\x1b[0;0H');
  
  const dashboard = `
    API Status Monitor
    -----------------
    Total Requests: ${stats.total}
    Successful: ${stats.success}
    Failed: ${stats.failure}
    
    Recent Requests:
    ${stats.history.slice(-5).map(h => 
      `${getStatusColor(h.code)}[${h.code}]${colors.reset} ${h.message}`
    ).join('\n    ')}
  `;
  
  // Clear lines from cursor down to clean up old content
  process.stdout.write('\x1b[J');
  process.stdout.write(dashboard);
}

async function makeStatusCall(code) {
  stats.total++;
  try {
    await axios.get(`${baseUrl}/${code}`);
    stats.success++;
    stats.history.push({
      code,
      message: `Request successful`
    });
  } catch (error) {
    stats.failure++;
    stats.history.push({
      code,
      message: `Error: ${error.message}`
    });
  }
  renderDashboard();
}

async function rotateStatusCalls() {
  let index = 0;
  renderDashboard();
  
  setInterval(() => {
    const code = statusCodes[index];
    makeStatusCall(code);
    index = (index + 1) % statusCodes.length;
  }, interval);
}

rotateStatusCalls();