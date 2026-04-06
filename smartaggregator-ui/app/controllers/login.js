const passport = require('passport');
const API = require('../rest/api');

exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/rpa-dashboard');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

exports.postLogin = (req, res, next) => {
  req.assert('username', 'Username cannot be blank').notEmpty();
  req.assert('password', 'Password cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (error) => {
      if (error) { return next(error); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      if (req.user.userType === 0) {
        delete req.session.redirectTo;
        return res.redirect('/companies-list');
      }
      var redirectTo = req.session.redirectTo || '/rpa-dashboard';
      if (redirectTo === '/logout' || redirectTo === '/login') {
        redirectTo = '/rpa-dashboard';
      }
      delete req.session.redirectTo;
      return res.redirect(redirectTo != '/announcements/unread-popup-announcement' ? redirectTo : '/rpa-dashboard');
    });
  })(req, res, next);
};

exports.logout = (req, res) => {
  if (req && req.user) {
    API.logout(req, function() {});
  }

  try {
    if (typeof req.logout === 'function') {
      if (req.logout.length > 0) req.logout(() => {});
      else req.logout();
    }
  } catch (e) {
    console.error('Error : Failed to logout from passport session.', e);
  }

  if (req && req.session) {
    req.session.destroy((err) => {
      if (err) console.error('Error : Failed to destroy the session during logout.', err);
      req.user = null;
      res.redirect('/login');
    });
  } else {
    req.user = null;
    res.redirect('/login');
  }
};