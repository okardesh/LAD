const markdown = require("markdown").markdown;

const API = require('../rest/api');


exports.getRequestApproval = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];
    let uuid = req.params.uuid;

    paths.push({uri: `${process.env.API_APPROVALS}/${uuid}`, method: 'GET', data: {}});

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
        res.render('pages/requestApproval', {
            title: 'Request',
            //deadlines: responses[`${process.env.API_DEADLINE}/wfa`].deadlineList,
            approval: responses[`${process.env.API_APPROVALS}/${uuid}`].approval,
            info: markdown.toHTML(req.__('info.requestApproval'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.getRequestApprovals = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_APPROVALS}`, method: 'GET', data: req.query.q});

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
        res.render('pages/requestApprovals', {
            title: 'Requests',
            approvals: responses[`${process.env.API_APPROVALS}`].approvals,
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.requestApprovals'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postRequestApprovals = async (req, res, next) => {
    let body = req.body,
        action = body.action;

    if (!['cancel', 'approve', 'reject', 'waiting', 'inspect', 'check'].includes(action)) {
        req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
        return res.redirect(req.path);
    }

    let request = {
        uri: `${process.env.API_APPROVALS}/${body.uuid}/${action}`,
        method: 'PUT',
        data: {
            approval: {
                approvalStatus: action,
                description: body.description
            }
        }
    };

    if (body.hasOwnProperty('checkId')) request.data.approval.checkId = body.checkId;
    if (body.hasOwnProperty('statusCode')) request.data.approval.statusCode = body.statusCode;
    if (body.hasOwnProperty('reason')) request.data.approval.reason = body.reason;

    let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

    if (data && data.statusCode === 403) {
        return res.redirect('/403');
    } else if (data && data.statusCode === 412) {
        let type, options;
        if ('check' === action) {
            type = 'warnings';
            let message = "<a href='/reconciliation-check-error/#' class='text-white' target='_blank'>There are <strong> #</strong> indicator(s). Please click for detailed error report</a>";
            options = {
                msg: message,
                params: data.error.split(' - ')
            }
        } else {
            type = 'modal';
            options = {
                msg: "There are # indicator(s). Are you sure you want to continue?",
                params: data.error.split(' - ').reverse(),
                uuid: body.uuid,
                type: body.action,
                statusCode: data.statusCode
            };
        }
        req.flash(type, options);
        return res.redirect(req.path);
    } else if (data && data.statusCode === 417) {
        const arr = data.error.split(' - ');
        const params = [arr.shift()];
        arr.forEach(function (part, index) {
            this[index] = req.__('model.' + arr[index]);
        }, arr);
        params.push(arr.join(", "));
        req.flash('modal', {
            msg: "The # table(s) are empty. Are you sure you want to continue?",
            params: params.reverse(),
            uuid: body.uuid,
            type: body.action,
            statusCode: data.statusCode
        });
        return res.redirect(req.path);
    } else if (data && data.statusCode === 424) {
        let tag = "<a href='/reconciliation-check-error/#' class='text-white' target='_blank'>";
        let message = req.__('Reconciliation checks failed')
        req.flash('errors', {msg: tag+message, params: data.error.split(' - ')});
        return res.redirect(req.path);
    } else if (data && data.error) {
        req.flash('errors', {msg: data.error});
        return res.redirect(req.path);
    } else if (data && data.statusCode === 200) {
        req.flash('success', {msg: 'The operation completed successfully.'});
        return res.redirect(req.path);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};
