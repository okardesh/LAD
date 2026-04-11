const passport = require('passport');
const markdown = require( "markdown" ).markdown;
const getSlug = require('speakingurl');

const API = require('../rest/api');

exports.getNotifications = async (req, res) => {
  req.session._notification_ = null;

  const permissionErrors = [],
      responses = {},
      paths = [];

  paths.push({uri: `${process.env.API_NOTIFICATIONS}`, method: 'GET', data: req.query.q});
  paths.push({uri: `${process.env.API_OPERATIONS_LIMITED}`, method: 'GET', data: {}});
  paths.push({uri: `${process.env.API_ROLES_LIMITED}`, method: 'GET', data: {}});
  
  for (const path of paths) {
      let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

      if (data && data.statusCode === 403)
          permissionErrors.push(path.uri);
      else if (data && data.statusCode === 200)
          responses[path.uri] = data;
  }

  if (permissionErrors.length > 0) {
      req.flash('error', {permissionErrors: permissionErrors});
      res.redirect('/403');
  } else if (Object.keys(responses).length === paths.length) {
      res.render('pages/notifications', {
          title: 'Notifications',
          notifications: responses[`${process.env.API_NOTIFICATIONS}`].notifications,
          operations: responses[`${process.env.API_OPERATIONS_LIMITED}`].operationsLimited,
          roles: responses[`${process.env.API_ROLES_LIMITED}`].rolesLimited,
          info: markdown.toHTML(req.__('info.notifications'))
      });
  }  else {
      return res.redirect('/500');
  }

};

exports.postNotifications= (req, res, next) => {
  req.session._notification_ = null;

  var notifications = req.body;
  var action = notifications.action;

  if ('new' === action) {
    return res.redirect('/notification/new');
  } else {
    return res.redirect('/notifications');
  }
};

exports.getNotification = async (req, res) => {
  var notification = req.session._notification_ || {};
  var uuid = req.params.uuid;

  const permissionErrors = [],
      responses = {},
      paths = [];

  if ('new' !== uuid) paths.push({uri: `${process.env.API_NOTIFICATIONS}/${uuid}`, method: 'GET', data: {}});
  paths.push({uri: `${process.env.API_OPERATIONS_LIMITED}`, method: 'GET', data: {}});
  paths.push({uri: `${process.env.API_ROLES_LIMITED}`, method: 'GET', data: {}});
  
  for (const path of paths) {
      let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

      if (data && data.statusCode === 403)
          permissionErrors.push(path.uri);
      else if (data && data.statusCode === 200)
          responses[path.uri] = data;
  }

  if (permissionErrors.length > 0) {
      req.flash('error', {permissionErrors: permissionErrors});
      res.redirect('/403');
  } else if (Object.keys(responses).length === paths.length) {
      res.render('pages/notification', {
          title: 'Notification',
          notification: responses[`${process.env.API_NOTIFICATIONS}/${uuid}`] ? responses[`${process.env.API_NOTIFICATIONS}/${uuid}`].notification : notification,
          operations: responses[`${process.env.API_OPERATIONS_LIMITED}`].operationsLimited,
          roles: responses[`${process.env.API_ROLES_LIMITED}`].rolesLimited,
          info: markdown.toHTML(req.__('info.notification'))
      });
  }  else {
      return res.redirect('/500');
  }
};

exports.postNotification = async(req, res) => {
  var notification = req.body;
  var action = notification.action;
  var uuid = req.params.uuid;
  var permissionErrors = [];

  notification.status = notification.status === 'on' ? 1 : 2;

  if (notification.to) if (!Array.isArray(notification.to)) notification.to = [notification.to];
  if (notification.cc) if (!Array.isArray(notification.cc)) notification.cc = [notification.cc];
  if (notification.bcc) if (!Array.isArray(notification.bcc)) notification.bcc = [notification.bcc];

  if ('new' === action) {
    req.session._notification_ = null;
    return res.redirect('/notification/new');
  } else if ('save' == action) {
    req.session._notification_ = notification;

    var response = await API.requestAsync(`${process.env.API_NOTIFICATIONS}`, 'POST', {notification: notification}, req, res);

    if (response && response.statusCode == 200) {
      req.session._notification_ = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/notifications');

    } else if (response && response.statusCode == 403) {
        permissionErrors.push(`${process.env.API_NOTIFICATIONS}`);

    } else if (response && response.error) {
      req.flash('errors', {msg: response.error});
      return res.redirect('/notification/new');

    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect('/notification/new');

    }

  } else if ('update' == action) {
    req.session._notification_ = notification;

    var responseUpdate = await API.requestAsync(`${process.env.API_NOTIFICATIONS}/${uuid}`, 'PUT', {notification: notification}, req, res);
    
    if (responseUpdate && responseUpdate.statusCode == 200) {
      req.session._notification_ = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect(`/notification/${uuid}`);

    } else if (responseUpdate && responseUpdate.statusCode == 403) {
      permissionErrors.push(`${process.env.API_NOTIFICATIONS}/${uuid}`);

    } else if (responseUpdate && responseUpdate.error) {
      req.flash('errors', {msg: responseUpdate.error});
      return res.redirect(`/notification/${uuid}`);

    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(`/notification/${uuid}`);
      
    }

  } else if ('delete' == action) {
    req.session._notification_ = null;

    var responseDelete = await API.requestAsync(`${process.env.API_NOTIFICATIONS}/${uuid}`, 'DELETE', {}, req, res);

    if (responseDelete && responseDelete.statusCode == 200) {
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/notifications');

    } else if (responseDelete && responseDelete.statusCode == 403) {
      permissionErrors.push(`${process.env.API_NOTIFICATIONS}/${uuid}`);

    } else if (responseDelete && responseDelete.error) {
      req.flash('errors', {msg: responseDelete.error});
      return res.redirect(`/notification/${uuid}`);

    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(`/notification/${uuid}`);

    }

  }

  if (permissionErrors.length > 0) {
    res.statusCode = 403;
    req.flash('error', {permissionErrors: permissionErrors});
    res.redirect('/403');
  }

};