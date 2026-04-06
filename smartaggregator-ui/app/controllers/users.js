const markdown = require( "markdown" ).markdown;
const path = require('path');
const API = require('../rest/api');
const s3 = require('../config/s3config');

function validator(file) {
  if (`${process.env.ACCEPTABLE_LOGO_TYPE}` !== path.extname(file.originalname)) return "Invalid file type";

  if (file.size > `${process.env.ACCEPTABLE_LOGO_SIZE}` * 1024 * 1024) return "File size is too large";

  return false;
}

const imgs = {};

function getDefaultRoleUuidsFromSessionUser(req) {
  try {
    if (!req || !req.user || !req.user.userDetails) return [];
    const details = typeof req.user.userDetails === 'string' ? JSON.parse(req.user.userDetails) : req.user.userDetails;
    if (!details || !Array.isArray(details.roles)) return [];
    return details.roles.length > 0 ? [details.roles[0]] : [];
  } catch (e) {
    return [];
  }
}

async function setImgs(arr) {
  if (!Array.isArray(arr)) return [];

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].photo) {
      if (!imgs.hasOwnProperty(arr[i].uuid) || imgs[arr[i].uuid].icon !== arr[i].photo) {
        imgs[arr[i].uuid] = {icon: arr[i].photo, img: await s3.getImage(arr[i].photo + '.png')}
      }

      arr[i].img = imgs[arr[i].uuid].img;
    }
  }

  return arr;
}

exports.getUsers = async (req, res) => {
 req.session._user_ = null;

  let me = req.user;

  const permissionErrors = [],
      responses = {},
      paths = [];

  paths.push({uri: `${process.env.API_USERS}`, method: 'GET', data: req.query.q || {limit: 1000, offset: 0, search: []}});
  paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});

  for (const p of paths) {
    let data = await API.requestAsync(p.uri, p.method, p.data, req, res);

    if (data && data.statusCode === 403)
      permissionErrors.push(p.uri);
    else if (data && data.statusCode === 200)
      responses[p.uri] = data;
  }

  if (permissionErrors.length > 0) {
    req.flash('error', {permissionErrors: permissionErrors});
    res.redirect('/403');
  } else if (Object.keys(responses).length === paths.length) {
   let subsidiaries = responses.hasOwnProperty(`${process.env.API_SUBSIDIARY_LIMITED}`) ? responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited : {};

   let users = responses[`${process.env.API_USERS}`].users;
   users.content = await setImgs(users.content);

    res.render('pages/users', {
      title: 'Users',
      users: users,
      subsidiaries: subsidiaries,
      me: me,
      info: markdown.toHTML(req.__('info.users'))
    });
  }  else {
    return res.redirect('/500');
  }
};

exports.postUsers = async (req, res, next) => {
  req.session._user_ = null;

  let body = req.body,
      action = body.action,
      uuid = body.uuid;

  if ('new' === action) {
    req.session._user_ = null;
    return res.redirect('/user/new');
  } else if ('save' === action && (!uuid || uuid === 'undefined')) {
    req.session._user_ = body;

    body.status = 1;
    if (body.userType === '0') body.subsidiary = null;
    if (body.userType === '0' || body.userFeature === '0') body.userFeature = null;
    if (body.roles && !Array.isArray(body.roles)) body.roles = [body.roles];
    if (!body.roles || body.roles.length === 0) {
      body.roles = getDefaultRoleUuidsFromSessionUser(req);
    }

    let data = await API.requestAsync(`${process.env.API_USERS}`, 'POST', {user: body}, req, res);

    if (data && data.statusCode === 403) {
      return res.redirect('/403');
    } else if (data && data.statusCode === 400) {
      req.flash('errors', {msg: req.__(data.error || 'Bad Request')});
      return res.redirect('/users');
    } else if (data && data.error) {
      req.flash('errors', {msg: data.error});
      return res.redirect('/users');
    } else if (data && data.statusCode === 200) {
      req.session._user_ = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/users');
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect('/users');
    }
  } else{
    req.session._user_ = body;

    let data = await API.requestAsync(`${process.env.API_USERS}/${uuid}/${action}`, 'POST', {user: body}, req, res);

    if (data && data.statusCode === 403) {
      return res.redirect('/403');
    } else if(data && data.statusCode === 409) {
      req.flash('errors', {msg: 'You cannot confirm your own registration.'});
      return res.redirect(req.path);
    } else if (data && data.error) {
      req.flash('errors', {msg: data.error});
      return res.redirect(req.path);
    } else if (data && data.statusCode === 200) {
      req.session._user_ = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect(req.path);
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(req.path);
    }
  }
};

exports.getUser = async (req, res) => {
  let _user_ = req.session._user_,
      uuid = req.params.uuid;

  const permissionErrors = [],
      responses = {},
      paths = [];

  paths.push({uri: `${process.env.API_ROLES_LIMITED}`, method: 'GET', data: {}});
  paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});
  if ('new' !== uuid && !_user_){
    paths.push({uri: `${process.env.API_USERS}/${uuid}`, method: 'GET', data: {}, luc: req.query.luc});
  }

  for (const p of paths) {
    let data = await API.requestAsync(`${p.uri}?luc=${p.luc}`, p.method, p.data, req, res);

    if (data && data.statusCode === 403)
      permissionErrors.push(p.uri);
    else if (data && data.statusCode === 200)
      responses[p.uri] = data;
  }

  if (permissionErrors.length > 0) {
    req.flash('error', {permissionErrors: permissionErrors});
    res.redirect('/403');
  } else if (Object.keys(responses).length === paths.length) {
    if (responses.hasOwnProperty(`${process.env.API_USERS}/${uuid}`)) {
      _user_ = responses[`${process.env.API_USERS}/${uuid}`].user;
    } else if (!_user_) _user_ = {userType:0,roles: [] , subsidiaries: []};

    let roles = responses.hasOwnProperty(`${process.env.API_ROLES_LIMITED}`) ? responses[`${process.env.API_ROLES_LIMITED}`].rolesLimited : {};
    let subsidiaries = responses.hasOwnProperty(`${process.env.API_SUBSIDIARY_LIMITED}`) ? responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited : {};

    res.render('pages/user', {
      title: 'User',
      __user : _user_,
      roles: roles,
      subsidiaries: subsidiaries,
      info: markdown.toHTML(req.__('info.user'))
    });
  } else {
    return res.redirect('/500');
  }
};

exports.postUser = async (req, res, next) => {
  let uuid = req.params.uuid,
      body = req.body,
      action = body.action;

  let request = {};

  if ('new' === action) {
    req.session._user_ = null;
    return res.redirect('/user/new');
  } else {
    req.session._user_ = body;

    switch (action) {
      case 'save':
        body.status = body.status === 'on' ? 1 : 1; // Default to Active (1) for new users
        if(body.userType === '0') body.subsidiary = null;
        if(body.userType === '0' || body.userFeature === '0') body.userFeature = null;
        if (body.roles && !Array.isArray(body.roles)) body.roles = [body.roles];
        if (!body.roles || body.roles.length === 0) body.roles = getDefaultRoleUuidsFromSessionUser(req);
        request = {uri: `${process.env.API_USERS}`, method: 'POST', data: {user: body}};
        break;
      case 'update':
        body.status = body.status === 'on' ? 1 : 2;
        if(body.userType === '0') body.subsidiary = null;
        if(body.userType === '0' || body.userFeature === '0') body.userFeature = null;
        if (!Array.isArray(body.roles)) body.roles = [body.roles];
        request = {uri: `${process.env.API_USERS}/${uuid}`, method: 'PUT', data: {user: body}};
        break;
      case 'delete':
        request = {uri: `${process.env.API_USERS}/${uuid}`, method: 'DELETE', data: {}};
        break;
      default:
        return res.redirect(req.path);
    }

    console.info("********** CALL API [USER SAVE] **********");
    console.info(`/${request.method} ${request.uri}`);
    console.info("DATA:", JSON.stringify(request.data, null, 2));

    let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

    console.info("********** END API [USER SAVE] **********");
    console.info("RESPONSE:", JSON.stringify(data, null, 2));

    if (data && data.statusCode === 403) {
      return res.redirect('/403');
    } else if (data && data.statusCode === 406) {
      req.flash('errors', {msg: 'If the approval status is not new, updates cannot be made.'});
      return res.redirect(req.path);
    } else if (data && data.statusCode === 400) {
      req.flash('errors', {msg: req.__(data.error || 'Bad Request')});
      console.error("400 Error:", data.error);
      return res.redirect(req.path);
    } else if (data && data.statusCode === 200) {
      req.session._user_ = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/users');
    } else if (data && data.error) {
      req.flash('errors', {msg: data.error});
      console.error("API Error:", data.error);
      return res.redirect(req.path);
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      console.error("Unknown API Error Response:", data);
      return res.redirect(req.path);
    }
  }
};

exports.getUserProfile = async (req, res) => {
  let uuid = req.user.uuid;

  const permissionErrors = [],
      responses = {},
      paths = [];

  paths.push({uri: `${process.env.API_ROLES_LIMITED}`, method: 'GET', data: {}});
  paths.push({uri: `${process.env.API_USER_PROFILE}`, method: 'GET', data: {}});

  for (const p of paths) {
    let data = await API.requestAsync(p.uri, p.method, p.data, req, res);

    if (data && data.statusCode === 403)
      permissionErrors.push(p.uri);
    else if (data && data.statusCode === 200)
      responses[p.uri] = data;
  }

  if (permissionErrors.length > 0) {
    req.flash('error', {permissionErrors: permissionErrors});
    res.redirect('/403');
  } else if (Object.keys(responses).length === paths.length) {
    req.session._user_ = responses[`${process.env.API_USER_PROFILE}`].user;
    let _user = responses[`${process.env.API_USER_PROFILE}`].user;
    if (_user.photo) _user.img = await s3.getImage(_user.photo + '.png');
    res.render('account/profile', {
      title: 'Profile',
      __user: _user,
      userRoles: responses[`${process.env.API_USER_PROFILE}`].user.roles,
      roles: responses[`${process.env.API_ROLES_LIMITED}`].rolesLimited,
      info: markdown.toHTML(req.__('info.user'))});
  } else {
    return res.redirect('/500');
  }
};

exports.postUserProfile = async (req, res, next) => {
 /**Sonarqube: var me = req.user; **/ 
  var uuid = req.user.uuid;
  var user = req.body;
  var action = req.body.action;
  var userRoles = user.roles;
  var userOriginal = req.session._user_;
  if (!Array.isArray(userRoles)) {
    user.roles = userOriginal.roles;
  }
  var currentPassword = req.body.currentPassword;
  var password = req.body.password;
  var repeatPassword = req.body.repeatPassword;

  if(action==="changePassword" && password!=="" && repeatPassword!=="" && password===repeatPassword){
    var data = {
      username: user.username,
      password: currentPassword
    };
    API.request(`${process.env.API_USER_CHECK_PASSWORD}`, 'POST', data, req, res, function(data0) {
      if (data0 && data0.statusCode == 200) {
        userOriginal.password = password;
        API.request(`${process.env.API_USERS}/${uuid}`, 'PUT', {user: userOriginal}, req, res, function(data1) {
          if (data1 && data1.statusCode == 200) {
            req.session.user = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect(`/profile`);
          } else if (data1 && data1.error) {
            req.flash('errors', {msg: data1.error});
            return res.redirect(`/profile`);
          } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(`/profile`);
          }
        });
      } else {
        req.flash('errors', {msg: data0.error});
        return res.redirect(`/profile`);
      }
    });
    } else {
        if (password !== repeatPassword) {
          req.flash('errors', {msg: 'Password does not match.'});
          return res.redirect(`/profile`);
      }else if(action!=="Update"){
      return res.redirect(`/profile`);
      } 
      }

  if(action==="Update"){
    req.session.user = user;
    delete user.password;
    let file = req.file;

    if (file) {
      let invalid = validator(file);

      if (invalid) {
        req.flash('errors', {msg: invalid});
        return res.redirect(req.path);
      } else user.photo = path.parse(file.key).name;
    }

    let response = await API.requestAsync(`${process.env.API_USER_PROFILE}`, 'PUT', {user: user}, req, res);

    if (response && response.statusCode === 403) {
      return res.redirect('/403');
    } else if (response && response.error) {
      req.flash('errors', {msg: response.error});
      return res.redirect(req.path);
    } else if (response && response.statusCode === 200) {
      req.session._user_ = null;
      req.user.photo = user.photo;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect(req.path);
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(req.path);
    }
  }

};
