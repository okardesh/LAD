const API = require('../rest/api');
const s3 = require('../config/s3config');

const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const jwt = require('jsonwebtoken');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'username', passReqToCallback: true }, (req, username, password, done) => {
  API.login(username, password, req, async function(user) {
    if (!user) {
      return done(null, false, {msg: 'Invalid username or password.'});
    }
    else {
      const u = JSON.parse(user.userDetails);
      if(u.subsidiary == null && u.userType !==0 && username !== 'admin')
      {
        return done(null, false, {msg: 'User\'s subsidiary is not approved.'});
      }
      user.email = u.email;
      user.name = u.name;
      user.uuid = u.uuid;
      user.surname = u.surname;
      user.subsidiary = u.subsidiary;
      userCompanyID = u.subsidiary;
      user.status = u.status;
      user.lastLoggedTime = u.lastLoggedTime;
      user.lastLoggedIp = u.lastLoggedIp;
      user.lastLoggedUserAgent = u.lastLoggedUserAgent;
      user.photo = u.photo;
      user.userType = u.userType;
      user.sideMenuPermission = JSON.parse(user.sideMenuPermission);
      user.organization = JSON.parse(user.organization);
      user.superAdmin = u.superAdmin;
      user.includeToSingleton = u.includeToSingleton;
      if (user.photo) user.img = await s3.getImage(user.photo + '.png');
      return done(null, user);
    }
  });
}));

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {

    var authorization = req.user.authorization;
    var token = authorization.replace("Bearer ", '');
    const { exp } = jwt.decode(token);
    var current_time = Date.now() / 1000;
    if ( exp < current_time) {
      req.logout();
      req.session.destroy((err) => {
        if (err) console.error('Error : Failed to destroy the session during logout.', err);
        req.user = null;
      });
    }
    return next();
  }
  req.session.redirectTo = req.originalUrl;
  res.redirect('/login');
};
