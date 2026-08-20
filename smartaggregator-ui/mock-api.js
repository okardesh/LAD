/**
 * Mock API Server for Local Development
 * Provides authentication and basic endpoints for the UI
 */
const path = require('path');
const express = require(path.join(__dirname, 'app/node_modules/express'));
const jwt = require(path.join(__dirname, 'app/node_modules/jsonwebtoken'));
const bodyParser = require(path.join(__dirname, 'app/node_modules/body-parser'));

const app = express();
const PORT = process.env.API_PORT || 8081;
const SECRET = "123!@#$%^PLM-123!@#$%^PLM";

let uploadedRows = [];

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toMinutes = (value) => {
  const seconds = toNumber(value, 0);
  if (seconds <= 0) return 0;
  return Math.round(seconds / 60);
};

const parseHourFromDateTime = (value) => {
  const text = `${value || ''}`;
  const match = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if (!match) return 0;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour)) return 0;
  return Math.max(0, Math.min(23, hour));
};

const parseDateFromDateTime = (value, fallback) => {
  const text = `${value || ''}`.trim();
  const match = text.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
  if (!match) return fallback;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = Number(match[3]);
  if (![first, second, third].every(Number.isFinite)) return fallback;

  const year = first > 31 ? first : third;
  const month = first > 31 ? second : (second > 12 ? third : second);
  const day = first > 31 ? third : (second > 12 ? second : first);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return fallback;

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

const dateKey = (value) => {
  const normalized = parseDateFromDateTime(value, null);
  if (!normalized) return null;
  const [day, month, year] = normalized.split('/');
  return `${year}-${month}-${day}`;
};

const filterByDateRange = (rows, startTime, endTime) => {
  const startKey = dateKey(startTime);
  const endKey = dateKey(endTime || startTime);
  if (!startKey || !endKey) return rows;

  return rows.filter((row) => {
    const rowKey = dateKey(row.startTime);
    return rowKey && rowKey >= startKey && rowKey <= endKey;
  });
};

const normalizeText = (value, fallback) => {
  const text = `${value || ''}`.trim();
  return text || fallback;
};

const normalizeRobotFilter = (robots) => {
  if (!robots) return null;
  if (Array.isArray(robots)) {
    const arr = robots.map((r) => normalizeText(r, '')).filter(Boolean);
    return arr.length > 0 ? arr : null;
  }
  const text = normalizeText(robots, '');
  if (!text) return null;
  const arr = text.split(/[|,]/).map((r) => r.trim()).filter(Boolean);
  return arr.length > 0 ? arr : null;
};

const filterByRobots = (rows, robots) => {
  const robotFilter = normalizeRobotFilter(robots);
  if (!robotFilter) return rows;
  const set = new Set(robotFilter);
  return rows.filter((row) => set.has(normalizeText(row.hostMachineName, 'N/A')));
};

const aggregateByRobot = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const robot = normalizeText(row.hostMachineName, 'N/A');
    const state = normalizeText(row.state, 'Unknown').toLowerCase();
    const releaseName = normalizeText(row.releaseName, 'Unknown Queue');
    const sourceType = normalizeText(row.sourceType, 'Manual');
    const totalJobTimeMinutes = toMinutes(row.totalJobTime);

    if (!map.has(robot)) {
      map.set(robot, {
        hostMachineName: robot,
        successfulCount: 0,
        faultedCount: 0,
        stoppedCount: 0,
        fullTime: 0,
        queueName: releaseName,
        sourceType,
      });
    }

    const agg = map.get(robot);
    if (state.includes('fault')) {
      agg.faultedCount += 1;
    } else if (state.includes('stop')) {
      agg.stoppedCount += 1;
    } else {
      agg.successfulCount += 1;
    }
    agg.fullTime += totalJobTimeMinutes;
  });

  return Array.from(map.values()).map((item) => {
    const capMinutes = 24 * 60;
    const fullTime = Math.max(0, Math.min(capMinutes, toNumber(item.fullTime, 0)));
    return {
      ...item,
      fullTime,
      freeTime: Math.max(0, capMinutes - fullTime)
    };
  });
};

const aggregateStateTotals = (rows) => {
  const totals = new Map();
  rows.forEach((row) => {
    const state = normalizeText(row.state, 'Unknown');
    totals.set(state, (totals.get(state) || 0) + 1);
  });
  return Array.from(totals.entries()).map(([state, count]) => ({ state, count }));
};

const aggregateRobotTotalTime = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const robot = normalizeText(row.hostMachineName, 'N/A');
    const minutes = toMinutes(row.totalJobTime);
    map.set(robot, (map.get(robot) || 0) + minutes);
  });
  return Array.from(map.entries()).map(([hostMachineName, totalJobTime]) => ({
    hostMachineName,
    totalJobTime
  }));
};

const aggregateReleaseTotals = (rows) => {
  const totals = new Map();
  rows.forEach((row) => {
    const key = normalizeText(row.releaseName, 'Unknown Queue');
    const value = toMinutes(row.totalJobTime);
    totals.set(key, (totals.get(key) || 0) + value);
  });
  return Array.from(totals.entries()).map(([releaseName, totalJobTime]) => ({ releaseName, totalJobTime }));
};

const toDailyIntensity = (rows) => {
  const byDayRelease = new Map();
  rows.forEach((row) => {
    const day = parseDateFromDateTime(row.startTime, normalizeText(row.dataDate, 'N/A'));
    const releaseName = normalizeText(row.releaseName, 'Unknown Queue');
    const key = `${day}|${releaseName}`;
    if (!byDayRelease.has(key)) {
      const seed = { dataDate: day, workDate: day, releaseName, count: 0 };
      for (let i = 0; i < 24; i += 1) {
        seed[`h${i}`] = 0;
      }
      byDayRelease.set(key, seed);
    }
    const hour = parseHourFromDateTime(row.startTime);
    const item = byDayRelease.get(key);
    item.count += 1;
    item[`h${hour}`] += 1;
  });
  return Array.from(byDayRelease.values());
};

const toWorkingHoursSummary = (rows, workDate, robots) => {
  const robotFilter = normalizeRobotFilter(robots);
  const selectedRows = filterByDateRange(filterByRobots(rows, robotFilter), workDate, workDate);
  const robotCount = robotFilter
    ? robotFilter.length
    : new Set(rows.map((row) => normalizeText(row.hostMachineName, 'N/A'))).size;
  const availableMinutes = robotCount * 9 * 60;
  const workedMinutes = Math.min(
    availableMinutes,
    selectedRows.reduce((sum, row) => sum + toMinutes(row.totalJobTime), 0)
  );

  return [{
    workDate: parseDateFromDateTime(workDate, workDate || null),
    workedHours: workedMinutes,
    freeHours: Math.max(0, availableMinutes - workedMinutes)
  }];
};

const aggregateQueueTransaction = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const queueName = normalizeText(row.releaseName, 'Unknown Queue');
    if (!map.has(queueName)) {
      map.set(queueName, { queueName, totalMinutes: 0, count: 0 });
    }
    const item = map.get(queueName);
    item.totalMinutes += toMinutes(row.totalJobTime);
    item.count += 1;
  });
  return Array.from(map.values()).map((item) => ({
    queueName: item.queueName,
    transactionExecutionTime: item.totalMinutes,
    averageTime: item.count > 0 ? Math.round(item.totalMinutes / item.count) : 0
  }));
};

const aggregateQueueStatus = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const queueName = normalizeText(row.releaseName, 'Unknown Queue');
    const state = normalizeText(row.state, 'Unknown').toLowerCase();
    if (!map.has(queueName)) {
      map.set(queueName, {
        queueName,
        successfulCount: 0,
        newCount: 0,
        inProgressCount: 0,
        failedCount: 0,
        abandonedCount: 0,
        retriedCount: 0
      });
    }
    const item = map.get(queueName);
    if (state.includes('fault') || state.includes('fail')) {
      item.failedCount += 1;
      item.retriedCount += 1;
    } else if (state.includes('stop')) {
      item.abandonedCount += 1;
      item.newCount += 1;
    } else {
      item.successfulCount += 1;
      item.inProgressCount += 1;
    }
  });
  return Array.from(map.values());
};

// Mock user credentials
const MOCK_USERS = {
  'okardes': {
    password: '123456',
    email: 'okardes@linktera.com.tr',
    name: 'Onur',
    surname: 'Kardes',
    uuid: 'user-uuid-12345',
    subsidiary: 1,
    userType: 1,
    status: 1,
    superAdmin: true,
    includeToSingleton: false,
    photo: null
  },
  'admin': {
    password: 'admin123',
    email: 'admin@linktera.com.tr',
    name: 'Admin',
    surname: 'User',
    uuid: 'admin-uuid-12345',
    subsidiary: 1,
    userType: 0,
    status: 1,
    superAdmin: true,
    includeToSingleton: false,
    photo: null
  }
};

/**
 * Login endpoint
 */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log(`[Mock API] Login attempt: ${username}`);

  // Check if user exists and password matches
  const user = MOCK_USERS[username] || Object.values(MOCK_USERS).find((u) => u.email === username);
  if (!user || user.password !== password) {
    console.log(`[Mock API] Login failed for user: ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT token
  const payload = {
    'User-Uuid': user.uuid,
    'Authorities': 'ROLE_USER,ROLE_ADMIN',
    'UserDetails': JSON.stringify({
      email: user.email,
      name: user.name,
      surname: user.surname,
      uuid: user.uuid,
      subsidiary: user.subsidiary,
      userType: user.userType,
      status: user.status,
      superAdmin: user.superAdmin,
      includeToSingleton: user.includeToSingleton,
      photo: user.photo,
      lastLoggedTime: new Date().toISOString(),
      lastLoggedIp: req.ip,
      lastLoggedUserAgent: req.get('user-agent')
    }),
    'sideMenuPermission': JSON.stringify([
      'rpa-dashboard',
      'companies-list',
      'rules',
      'requests',
      'announcements'
    ]),
    'organization': JSON.stringify({
      id: 1,
      name: 'Test Organization'
    }),
    'iat': Math.floor(Date.now() / 1000),
    'exp': Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = jwt.sign(payload, SECRET, { algorithm: 'HS256' });

  console.log(`[Mock API] Login successful for user: ${username}`);
  console.log(`[Mock API] Generated token with expiry: ${payload.exp}`);

  // Return token in Authorization header
  res.set('Authorization', `Bearer ${token}`);
  res.status(200).json({ 
    success: true, 
    message: 'Login successful',
    user: {
      username: username,
      email: user.email,
      name: user.name
    }
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/mock-role-operations', (req, res) => {
  res.status(200).json({ rolePermissionAll: [] });
});

app.get('/mock-rpad-charts-status/:userId', (req, res) => {
  res.status(200).json({
    rpadChartsStatusList: [
      { chartName: 'chart1', chartStatus: true, location: 1 },
      { chartName: 'chart2', chartStatus: true, location: 2 },
      { chartName: 'chart3', chartStatus: true, location: 3 },
      { chartName: 'chart4', chartStatus: true, location: 4 },
      { chartName: 'chart5', chartStatus: true, location: 5 },
      { chartName: 'chart6', chartStatus: true, location: 6 },
      { chartName: 'chart8', chartStatus: true, location: 7 },
      { chartName: 'chart9', chartStatus: true, location: 8 }
    ]
  });
});

app.get('/mock-histories/:userId', (req, res) => {
  res.status(200).json({
    rpadHistoryList: Array.from({ length: 8 }, () => ({
      robots: null,
      date1: null,
      date2: null
    }))
  });
});

app.post('/mock-rpad-history-save', (req, res) => {
  res.status(200).json({ success: true, historyList: (req.body && req.body.historyList) || [] });
});

app.post('/mock-rpad-charts-status-save', (req, res) => {
  res.status(200).json({ success: true, chartsStatusList: (req.body && req.body.chartsStatusList) || [] });
});

app.get('/mock-rpad-robot-list', (req, res) => {
  const rows = uploadedRows;
  const robotRows = aggregateByRobot(rows);
  const latestDate = rows.length > 0
    ? parseDateFromDateTime(rows[rows.length - 1].startTime, normalizeText(rows[rows.length - 1].dataDate, null))
    : null;
  res.status(200).json({
    rpad: {
      hosts: robotRows.map((r) => ({
        hostMachineName: r.hostMachineName,
        lastDate: latestDate,
        lastJobsDate: latestDate
      })),
      robotNames: robotRows.map((r) => ({
        robotName: r.hostMachineName,
        lastQueueDate: latestDate
      }))
    }
  });
});

app.get('/mock-dashboard-table/rpad', (req, res) => {
  const jobs = uploadedRows;
  const robotAgg = aggregateByRobot(jobs);
  const states = aggregateStateTotals(jobs);
  const releaseTotals = aggregateReleaseTotals(jobs);
  const dailyIntensity = toDailyIntensity(jobs);
  const queueTransaction = aggregateQueueTransaction(jobs);
  const queueStatus = aggregateQueueStatus(jobs);

  res.status(200).json({
    rpad: {
      jobsData: jobs,
      rpadStateChart: states,
      rpadStateChart2: robotAgg,
      robotsOccupancyRateChart2: robotAgg,
      workingHoursOccupancyChart: dailyIntensity,
      totalJobTimeChart: aggregateRobotTotalTime(jobs),
      overallChart: dailyIntensity,
      robotsOccupancyRateChart: robotAgg,
      releaseTotalTimeChart: releaseTotals,
      dailyDensityChart: dailyIntensity,
      queueTransactionTimeChart: queueTransaction,
      queueStatusChart: queueStatus
    }
  });
});

app.post('/mock-system/upload', (req, res) => {
  const table = req.body && req.body.table;
  const list = req.body && req.body.list;

  if (!table || !Array.isArray(list)) {
    return res.status(400).json({ error: 'Request is incorrect.' });
  }

  uploadedRows = list;
  return res.status(200).json({ success: true, processed: list.length, table });
});

app.post('/mock-rpad-state-filter', (req, res) => {
  const rows = filterByRobots(uploadedRows, req.body && req.body.robots);
  res.status(200).json({ rpadJobsList: aggregateStateTotals(rows) });
});

app.post('/mock-rpad-state-by-robot-filter', (req, res) => {
  const rows = filterByRobots(uploadedRows, req.body && req.body.robots);
  res.status(200).json({ rpadJobsList: aggregateByRobot(rows) });
});

app.post('/mock-robots-occupancy-filter', (req, res) => {
  const rows = filterByDateRange(uploadedRows, req.body && req.body.startTime, req.body && req.body.endTime);
  res.status(200).json({ rpadJobsList: aggregateByRobot(rows) });
});

app.post('/mock-robots-occupancy-by-robot-filter', (req, res) => {
  const robotRows = filterByRobots(uploadedRows, req.body && req.body.robots);
  const rows = filterByDateRange(robotRows, req.body && req.body.startTime, req.body && req.body.endTime);
  res.status(200).json({ rpadJobsList: aggregateByRobot(rows) });
});

app.post('/mock-working-hours-occupancy-filter', (req, res) => {
  res.status(200).json({
    rpadDailyIntensityList: toWorkingHoursSummary(
      uploadedRows,
      req.body && req.body.workDate,
      req.body && req.body.robots
    )
  });
});

app.post('/mock-daily-density-filter', (req, res) => {
  const rows = filterByRobots(uploadedRows, req.body && req.body.robots);
  res.status(200).json({ rpadDailyIntensityList: toDailyIntensity(rows) });
});

app.post('/mock-overall-worked-time-filter', (req, res) => {
  const rows = filterByRobots(uploadedRows, req.body && req.body.robots);
  res.status(200).json({ rpadDailyIntensityList: toDailyIntensity(rows) });
});

app.post('/mock-total-job-time-filter', (req, res) => {
  const rows = filterByRobots(uploadedRows, req.body && req.body.robots);
  res.status(200).json({ rpadJobsList: aggregateRobotTotalTime(rows) });
});

app.post('/mock-release-total-time-filter', (req, res) => {
  res.status(200).json({ rpadJobsList: aggregateReleaseTotals(uploadedRows) });
});

app.post('/mock-rpad-data-filter', (req, res) => {
  res.status(200).json({ rpadJobsList: uploadedRows });
});

app.post('/mock-queue-transaction-filter', (req, res) => {
  res.status(200).json({ rpadQueueList: aggregateQueueTransaction(uploadedRows) });
});

app.post('/mock-queue-status-filter', (req, res) => {
  res.status(200).json({ rpadQueueList: aggregateQueueStatus(uploadedRows) });
});

/**
 * Catch-all for unimplemented endpoints
 */
app.use((req, res) => {
  console.log(`[Mock API] ${req.method} ${req.path} - Not Implemented`);
  res.status(501).json({ 
    error: 'Not Implemented',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ Mock API Server running at http://localhost:${PORT}`);
  console.log(`\nDefault credentials:`);
  console.log(`  Username: okardes`);
  console.log(`  Password: 123456`);
  console.log(`\n  Username: admin`);
  console.log(`  Password: admin123\n`);
});
