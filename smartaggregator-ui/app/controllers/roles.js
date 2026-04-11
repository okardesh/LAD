const markdown = require("markdown").markdown;
const {response} = require("express");
const API = require('../rest/api');

exports.getRoles = async (req, res) => {
    req.session._role_ = null;

    const permissionErrors = [],
        responses = {},
        paths = [],
        query = req.query.q || {};

        if (!query.hasOwnProperty('search')) query.search = [{key: "approvalStatus", operation: "!=", value: "C"}];

    paths.push({uri: `${process.env.API_ROLES}`, method: 'GET', data: query});

    for (const path of paths) {
        let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(path.uri);
        else if (data && data.statusCode === 200)
            responses[path.uri] = data;
    }

    if (permissionErrors.length > 0) {
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        res.render('pages/roles', {
            title: 'Roles',
            roles: responses[`${process.env.API_ROLES}`].roles,
            info: markdown.toHTML(req.__('info.roles'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postRoles = (req, res, next) => {
    req.session._role_ = null;

    let role = req.body,
        action = role.action,
        uuid = role.uuid;
    /*Sonar Bug Fixed const permissionErrors = [];*/

    if ('new' === action) {
        return res.redirect('/role/new');
    } else {
        req.session._role_ = role;
        API.request(`${process.env.API_ROLES}/${uuid}/${action}`, 'POST', {role: role}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._role_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/roles`);
            } else if (data && data.statusCode === 403) {
                res.redirect('/403');
            } else if (data && data.statusCode === 409 && action === "approve") {
                req.flash('errors', {msg: 'You cannot confirm your own registration.'});
                return res.redirect(`/roles`);
            } else if (data && data.statusCode === 410 && action === "cancel") {
                req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
                return res.redirect(`/roles`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/roles`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/roles`);
            }
        });
    }
};

exports.getRole = async (req, res) => {
    /*Sonar Bug Fixed let _role_ = req.session._role_,*/
    let  uuid = req.params.uuid;
    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_OPERATIONS_LIMITED}`, method: 'GET', data: {}});

    if ('new' !== uuid) {
        paths.push({uri: `${process.env.API_ROLES}/${uuid}`, method: 'GET', data: {}});
    }

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
        const operations = responses[`${process.env.API_OPERATIONS_LIMITED}`].operationsLimited;

            res.render('pages/role', {
                title: 'Role',
                role: responses.hasOwnProperty(`${process.env.API_ROLES}/${uuid}`) ? responses[`${process.env.API_ROLES}/${uuid}`].role : {operations: []},
                operations: operations,
                info: markdown.toHTML(req.__('info.role'))
            });
    } else {
        return res.redirect('/500');
    }
};

exports.postRole = async (req, res, next) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    let request = {};

    if ('new' === action) {
        req.session._role_ = null;
        return res.redirect('/role/new');
    } else {
        req.session._role_ = body;

        switch (action) {
            case 'save':
                body.status = body.status === 'on' ? 1 : 2;
                body.subsidiaryView = body.subsidiaryView === 'on' ? 1 : 0;
                body.operations = body.operations ? (Array.isArray(body.operations) ? body.operations : [body.operations]) : [];
                request = {uri: `${process.env.API_ROLES}`, method: 'POST', data: {role: body}};
                break;
            case 'update':
                body.status = body.status === 'on' ? 1 : 2;
                body.subsidiaryView = body.subsidiaryView === 'on' ? 1 : 0;
                body.operations = body.operations ? (Array.isArray(body.operations) ? body.operations : [body.operations]) : [];
                request = {uri: `${process.env.API_ROLES}/${uuid}`, method: 'PUT', data: {role: body}};
                break;
            case 'delete':
                request = {uri: `${process.env.API_ROLES}/${uuid}`, method: 'DELETE', data: {}};
                break;
            default: {
                if (['approve', 'cancel', 'sendForApproval', 'reject'].includes(action)) {
                    request = {uri: `${process.env.API_ROLES}/${uuid}/${action}`, method: 'POST', data: {role: body}};
                } else {
                    req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
                    return res.redirect(req.path);
                }
            }
        }

        let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

        if (data && data.statusCode === 403) {
            return res.redirect('/403');
        } else if (data && data.statusCode === 406) {
            req.flash('errors', {msg: 'To update, the registration status must be new or rejected.'});
            return res.redirect(req.path);
        } else if (data && data.statusCode === 409) {
            req.flash('errors', {msg: 'You cannot confirm your own registration.'});
            return res.redirect(req.path);
        } else if (data && data.statusCode === 410) {
            req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
            return res.redirect(req.path);
        } else if (data && data.error) {
            req.flash('errors', {msg: data.error});
            return res.redirect(req.path);
        } else if (data && data.statusCode === 200) {
            req.session._role_ = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect(['save', 'delete'].includes(action) ? '/roles' : req.path);
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }
    }
};