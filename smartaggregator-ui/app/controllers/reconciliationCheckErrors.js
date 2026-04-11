const markdown = require( "markdown" ).markdown;

const API = require('../rest/api');

exports.getReconciliationCheckErrors = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_RECONCILIATION_CHECKS_ERRORS}`, method: 'GET', data: req.query.q});
    paths.push({uri: `${process.env.API_USERS_LIMITED}`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});

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
        res.render('pages/reconciliationCheckErrors', {
            title: 'ReconciliationCheckErrors',
            reconciliationCheckErrorsList: responses[`${process.env.API_RECONCILIATION_CHECKS_ERRORS}`].reconciliationCheckErrorsList,
            userList: responses[`${process.env.API_USERS_LIMITED}`].userList,
            subsidiaryList: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.reconciliationCheckErrors'))
        });
    }  else {
        return res.redirect('/500');
    }
};

exports.getReconciliationCheckError = async (req, res) => {
    const uuid = req.params.uuid,
        permissionErrors = [],
        responses = {},
        paths = [];
    paths.push({uri: `${process.env.API_RECONCILIATION_CHECKS_ERRORS}/${uuid}`, method: 'GET',  data: req.query.q});

    for (const path of paths) {
        let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(path.uri);
        else if (data && data.statusCode === 200)
            responses[path.uri] = data;
    }

    if (permissionErrors.length > 0) {
        res.statusCode = 403;
        req.flash('error', {permissionErrors: permissionErrors});
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        res.render('pages/reconciliationCheckError', {
            title: 'ReconciliationCheckError',
            reconciliationCheckError: responses[`${process.env.API_RECONCILIATION_CHECKS_ERRORS}/${uuid}`].reconciliationCheckError,
            info: markdown.toHTML(req.__('info.reconciliationCheckError'))
        });
    }  else {
        return res.redirect('/500');
    }
};