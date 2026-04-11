const markdown = require( "markdown" ).markdown;

const API = require('../rest/api');

exports.getReconciliationChecks = async (req, res) => {
    req.session.reconciliationCheck = null;

    const permissionErrors = [],
        responses = {},
        paths = [],
        query = req.query.q || {};

    if (!query.hasOwnProperty('search')) query.search = [{key: "approvalStatus", operation: "!=", value: "C"}];

    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_RECONCILIATION_CHECKS}`, method: 'GET', data: query});

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
        res.render('pages/reconciliationChecks', {
            title: 'Reconciliation Checks',
            reconciliationChecks: responses[`${process.env.API_RECONCILIATION_CHECKS}`].reconciliationChecks,
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.reconciliationChecks'))
        });
    }  else {
        return res.redirect('/500');
    }
};

exports.postReconciliationChecks = (req, res, next) => {
    req.session.reconciliationCheck = null;

    let reconciliationCheck = req.body,
        action = reconciliationCheck.action,
        uuid = reconciliationCheck.uuid,
        permissionErrors = [];

    if ('new' === action) {
        return res.redirect('/reconciliation-check/new');
    } else {
        req.session._reconciliationCheck_ = reconciliationCheck;
        API.request(`${process.env.API_RECONCILIATION_CHECKS}/${uuid}/${action}`, 'POST', {reconciliationCheck: reconciliationCheck}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._reconciliationCheck_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/reconciliation-checks`);
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_RECONCILIATION_CHECKS}/${action}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.statusCode === 409 && action === "approve") {
                req.flash('errors', {msg: 'You cannot confirm your own registration.'});
                return res.redirect(`/reconciliation-checks`);
            } else if (data && data.statusCode === 410 && action === "cancel") {
                req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
                return res.redirect(`/reconciliation-checks`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/reconciliation-checks`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/reconciliation-checks`);
            }

        });
    }
};

exports.getReconciliationCheck = async (req, res) => {
    let reconciliationCheck = req.session.reconciliationCheck,
        uuid = req.params.uuid;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri : `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});
    if ('new' !== uuid)
        paths.push({uri: `${process.env.API_RECONCILIATION_CHECKS}/${uuid}`, method: 'GET', data: {}});

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
        reconciliationCheck = responses.hasOwnProperty(`${process.env.API_RECONCILIATION_CHECKS}/${uuid}`) ? responses[`${process.env.API_RECONCILIATION_CHECKS}/${uuid}`].reconciliationCheck : (reconciliationCheck ? reconciliationCheck : {subsidiaries: []});
        res.render('pages/reconciliationCheck', {
            title: 'Reconciliation Check',
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            reconciliationCheck: reconciliationCheck,
            info: markdown.toHTML(req.__('info.reconciliationCheck'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postReconciliationCheck = async (req, res, next) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    let request = {};

    if ('new' === action) {
        req.session.reconciliationCheck = null;
        return res.redirect('/reconciliation-check/new');
    } else {
        req.session.reconciliationCheck = body;

        let obj = body;

        switch (action) {
            case 'save':
                body.status = body.status === 'on' ? 1 : 2;
                obj.subsidiaries = obj.subsidiaries ? (Array.isArray(obj.subsidiaries) ? obj.subsidiaries : [obj.subsidiaries]) : [];
                request = {uri: `${process.env.API_RECONCILIATION_CHECKS}`, method: 'POST', data: {reconciliationCheck: body}};
                break;
            case 'update':
                body.status = body.status === 'on' ? 1 : 2;
                obj.subsidiaries = obj.subsidiaries ? (Array.isArray(obj.subsidiaries) ? obj.subsidiaries : [obj.subsidiaries]) : [];
                request = {uri: `${process.env.API_RECONCILIATION_CHECKS}/${uuid}`, method: 'PUT', data: {reconciliationCheck: body}};
                break;
            case 'delete':
                request = {uri: `${process.env.API_RECONCILIATION_CHECKS}/${uuid}`, method: 'DELETE', data: {}};
                break;
            default: {
                if (['approve', 'cancel', 'sendForApproval', 'reject'].includes(action)) {
                    request = {uri: `${process.env.API_RECONCILIATION_CHECKS}/${uuid}/${action}`, method: 'POST', data: {reconciliationCheck: body}};
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
            return res.redirect(`/reconciliation-check/${uuid}`);
        } else if (data && data.statusCode === 409 && action === "approve") {
            req.flash('errors', {msg: 'You cannot confirm your own registration.'});
            return res.redirect(`/reconciliation-check/${uuid}`);
        } else if (data && data.statusCode === 410 && action === "cancel") {
            req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
            return res.redirect(`/reconciliation-check/${uuid}`);
        } else if (data && data.error) {
            req.flash('errors', {msg: data.error});
            return res.redirect(req.path);
        } else if (data && data.statusCode === 200) {
            req.session.reconciliationCheck = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('update' === action ? req.path : '/reconciliation-checks');
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }

    }
};