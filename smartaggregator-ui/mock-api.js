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

app.use(bodyParser.json());

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
