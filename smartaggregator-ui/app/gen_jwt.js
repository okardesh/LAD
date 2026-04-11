const jwt = require('jsonwebtoken');
const payload = { 
    'User-Uuid': '00b75e71-4ae0-4255-b335-92e39154de00', 
    'Authorities': 'ADMIN,SUPER_ADMIN', 
    'UserDetails': '{}', 
    'sideMenuPermission': '[]', 
    'organization': '{}', 
    'sub': 'admin' 
};
const token = jwt.sign(payload, '123!@#$%^PLM-123!@#$%^PLM', { algorithm: 'HS512', expiresIn: '1d' });
console.log(token);
