const jwt = require('jsonwebtoken');
const payload = { 
    'User-Uuid': '00b75e71-4ae0-4255-b335-92e39154de00', 
    'Authorities': 'ADMIN,SUPER_ADMIN', 
    'UserDetails': JSON.stringify({ name: 'System', surname: 'Admin', email: 'admin@example.com' }), 
    'sideMenuPermission': '[]', 
    'organization': JSON.stringify({ name: 'Local Dev Org', code: 'ORG001' }), 
    'sub': 'admin' 
};
const token = jwt.sign(payload, '123!@#$%^PLM-123!@#$%^PLM', { algorithm: 'HS512', expiresIn: '1d' });
console.log(token);
