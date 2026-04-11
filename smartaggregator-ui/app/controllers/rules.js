const markdown = require("markdown").markdown;

const API = require('../rest/api');

exports.getRules = async (req, res) => {
    req.session._rule_ = null;

    const permissionErrors = [],
        responses = {},
        paths = [],
        query = req.query.q || {};

        if (!query.hasOwnProperty('search')) query.search = [{key: "approvalStatus", operation: "!=", value: "C"}];

    paths.push({uri: `${process.env.API_SYSTEM}/api-operations`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_RULES}`, method: 'GET', data: query});

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
        res.render('pages/rules', {
            title: 'Rules',
            rules: responses[`${process.env.API_RULES}`].rules,
            operations: responses[`${process.env.API_SYSTEM}/api-operations`].operationsLimited,
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.rules'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postRules = (req, res, next) => {
    req.session._rule_ = null;

    let rule = req.body,
        action = rule.action,
        uuid = rule.uuid,
        permissionErrors = [];

    if ('new' === action) {
        return res.redirect('/rule/new');
    } else {
        req.session._rule_ = rule;
        API.request(`${process.env.API_RULES}/${uuid}/${action}`, 'POST', {rule: rule}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._rule_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/rules`);
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_RULES}/${action}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.statusCode === 409 && action === "approve") {
                req.flash('errors', {msg: 'You cannot confirm your own registration.'});
                return res.redirect(`/rules`);
            } else if (data && data.statusCode === 410 && action === "cancel") {
                req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
                return res.redirect(`/rules`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/rules`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/rules`);
            }

        });
    }
};

exports.getRule = async (req, res) => {
    let _rule_ = req.session._rule_,
        uuid = req.params.uuid;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_SYSTEM}/api-operations`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});

    if ('new' !== uuid && !_rule_) {
        paths.push({uri: `${process.env.API_RULES}/${uuid}`, method: 'GET', data: {}});
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
        if (responses.hasOwnProperty(`${process.env.API_RULES}/${uuid}`)) {
            _rule_ = responses[`${process.env.API_RULES}/${uuid}`].rule;
        } else if (!_rule_) _rule_ = {operations: [], subsidiaries: []};
        res.render('pages/rule', {
            title: 'Rule',
            rule: _rule_,
            operations: responses[`${process.env.API_SYSTEM}/api-operations`].operationsLimited,
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.rule'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postRule = async (req, res, next) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    let request = {};

    if ('new' === action) {
        req.session._rule_ = null;
        return res.redirect('/rule/new');
    } else {
        body.conditions = body.conditions ? JSON.parse(body.conditions) : [];
        body.expressionConditions = body.expressionConditions ? JSON.parse(body.expressionConditions) : [];
        body.queryConditions = body.queryConditions ? JSON.parse(body.queryConditions) : [];
        body.operations = !body.operations ? [] : (!Array.isArray(body.operations) ? [body.operations] : body.operations);
        body.subsidiaries = !body.subsidiaries ? [] : (!Array.isArray(body.subsidiaries) ? [body.subsidiaries] : body.subsidiaries);
        body.runForOrganization = body.runForOrganization === 'on' ? 1 : 0;

        req.session._rule_ = body;

        switch (action) {
            case 'save':
                body.status = body.status === 'on' ? 1 : 2;
                request = {uri: `${process.env.API_RULES}`, method: 'POST', data: {rule: body}};
                break;
            case 'update':
                body.status = body.status === 'on' ? 1 : 2;
                request = {uri: `${process.env.API_RULES}/${uuid}`, method: 'PUT', data: {rule: body}};
                break;
            case 'delete':
                request = {uri: `${process.env.API_RULES}/${uuid}`, method: 'DELETE', data: {}};
                break;
            default: {
                if (['approve', 'cancel', 'sendForApproval', 'reject'].includes(action)) {
                    request = {uri: `${process.env.API_RULES}/${uuid}/${action}`, method: 'POST', data: {rule: body}};
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
            return res.redirect(`/rule/${uuid}`);
        } else if (data && data.statusCode === 409 && action === "approve") {
            req.flash('errors', {msg: 'You cannot confirm your own registration.'});
            return res.redirect(`/rule/${uuid}`);
        } else if (data && data.statusCode === 410 && action === "cancel") {
            req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
            return res.redirect(`/rule/${uuid}`);
        } else if (data && data.error) {
            req.flash('errors', {msg: data.error});
            return res.redirect(req.path);
        } else if (data && data.statusCode === 200) {
            req.session._rule_ = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect(['save', 'delete'].includes(action) ? '/rules' : req.path);
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }
    }
};