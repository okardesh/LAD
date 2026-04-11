const markdown = require("markdown").markdown;

const API = require('../rest/api');

exports.getRequests = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: req.query.q});
    //paths.push({uri: `${process.env.API_APPROVALS}`, method: 'GET', data: req.query.q});
    paths.push({uri: `${process.env.API_DEADLINE}/wfa`, method: 'GET', data: req.query.q});

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
        res.render('pages/requests', {
            title: 'Requests',
            deadlines: responses[`${process.env.API_DEADLINE}/wfa`].deadlineList,
            //approvals: responses[`${process.env.API_APPROVALS}`].approvals,
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.requests'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postRequests = async (req, res, next) => {
    let body = req.body,
        item = body.item,
        action = body.action,
        checkId = body.checkId;

    let request = {
        method: 'PUT',
        data: {}
    };

    if (checkId && !item) {
        item = 'approval';
        request.checkId = checkId;
    }

    if (!['cancel', 'approve', 'reject', 'waiting', 'inspect'].includes(action)) {
        req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
        return res.redirect('/requests');
    }

    switch (item) {
        case 'deadline':
            request.uri = `${process.env.API_DEADLINE}/${body.uuid}/${action}`;
            break;
        /*case 'approval':
            request.uri = `${process.env.API_APPROVALS}/${body.uuid}/${action}`;
            break;*/
        default:
            req.flash('errors', {msg: 'Selection not detected. Please try again'});
            return res.redirect('/requests');
    }

    request.data[item] = {
        approvalStatus: action,
        description: body.description
    };

    if (request.hasOwnProperty('checkId')) request.data[item].checkId = request.checkId;
    if (body.hasOwnProperty('statusCode')) request.data[item].statusCode = body.statusCode;
    if (body.hasOwnProperty('reason')) request.data[item].reason = body.reason;

    let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

    if (data && data.statusCode === 403) {
        return res.redirect('/403');
    } else if (data && data.statusCode === 412) {
        req.flash('modal', {
            msg: "There are # indicator(s). Are you sure you want to continue?",
            params: data.error.split(' - ').reverse(),
            uuid: body.uuid,
            type: body.action,
            statusCode: data.statusCode
        });
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
        let message = "<a href='/reconciliation-check-error/#' class='text-white' target='_blank'>Reconciliation checks failed. There are <strong> #</strong> error(s). Please click for detailed error report</a>";
        req.flash('errors', {msg: message, params: data.error.split(' - ')});
        return res.redirect(req.path);
    } else if (data && data.error) {
        req.flash('errors', {msg: data.error});
        return res.redirect(req.path);
    } else if (data && data.statusCode === 200) {
        req.flash('success', {msg: item === 'deadline' && action === 'waiting' ? 'Your data entry request has been sent to the Business Unit.' : 'The operation completed successfully.'});
        return res.redirect(req.path);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};