const markdown = require("markdown").markdown;
const API = require('../rest/api');

const tables = [
    "SUB_ACCT_PLACED_COLLATERAL",
    "SUB_ASSET_ACC",
    "SUB_ASSET_ITEM",
    "SUB_CIU_FUND_COMPONENT",
    "SUB_CIU_FUND_INFO",
    "SUB_COLLATERAL",
    "SUB_CURRENCY_TABLE",
    "SUB_CUSTOMERS",
    "SUB_DEGREE",
    "SUB_FX_FUTURES",
    "SUB_INTRAGROUP_TRANSACTION",
    "SUB_LIABILITY_ACC",
    "SUB_NETTING_AGREEMENT",
    "SUB_NET_EXPOSURE",
    "SUB_LIABILITY_ITEM",
    "SUB_OFF_BALANCE_SHEET",
    "SUB_OFF_BALANCE_SHEET_ACC",
    "SUB_OPTION",
    "SUB_PAYMENT_SCHEDULE",
    "SUB_REPO",
    "SUB_SECURITY",
    "SUB_SWAP"
];

exports.getTrendAnalyzes = async (req, res) => {
    req.session._trendAnalysis_ = null;

    const render = {
        title: 'Trend Analyzes',
        page: "trendAnalyzes",
        objects: [
            {
                key: "trendAnalyzes",
                name: "trendAnalyzes",
                uri: `${process.env.API_TREND_ANALYSIS}`,
                method: 'GET',
                data: req.query.q
            },
            {
                key: "subsidiaries",
                name: "subsidiariesLimited",
                uri: `${process.env.API_SUBSIDIARY_LIMITED}`,
                method: 'GET',
                data: {}
            }
        ]
    };

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.tableNameList = tables;

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postTrendAnalyzes = (req, res) => {
    req.session._trendAnalysis_ = null;
    let action = req.body.action;

    if ('new' === action) {
        return res.redirect('/trend-analysis/new');
    } else {
        return res.redirect(req.path);
    }
};

exports.getTrendAnalysis = async (req, res) => {
    let trendAnalysis = req.session._trendAnalysis_,
        uuid = req.params.uuid;

    const render = {
        title: 'Trend Analysis',
        page: "trendAnalysis",
        objects: [{
            key: "subsidiaries",
            name: "subsidiariesLimited",
            uri: `${process.env.API_SUBSIDIARY_LIMITED}`,
            method: 'GET',
            data: {}
        }]
    };

    if ('new' !== uuid && !trendAnalysis) {
        render.objects.push({
            key: 'trendAnalysis',
            name: 'trendAnalysis',
            uri: `${process.env.API_TREND_ANALYSIS}/${uuid}`,
            method: 'GET',
            data: {}
        });
    }

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.trendAnalysis = render.trendAnalysis || trendAnalysis || {};
        render.tables = tables;

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postTrendAnalysis = async (req, res) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    if ('new' === action) {
        req.session._trendAnalysis_ = null;
        return res.redirect('/trend-analysis/new');
    } else {
        body.params = body.params ? JSON.parse(body.params) : [];

        req.session._trendAnalysis_ = body;

        let request = [];
        switch (action) {
            case 'save':
                request.push({uri: `${process.env.API_TREND_ANALYSIS}`, method: 'POST', data: {trendAnalysis: body}});
                break;
            case 'update':
                request.push({
                    uri: `${process.env.API_TREND_ANALYSIS}/${uuid}`,
                    method: 'PUT',
                    data: {trendAnalysis: body}
                });
                break;
            case 'delete':
                request.push({uri: `${process.env.API_TREND_ANALYSIS}/${uuid}`, method: 'DELETE', data: {}});
                break;
            default:
                req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
                return res.redirect(req.path);
        }

        let responses = await API.responser(req, res, request);

        if (responses.hasOwnProperty(200)) {
            req.session._trendAnalysis_ = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('update' === action ? req.path : '/trend-analyzes');
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }

    }
};

exports.scriptTrendAnalysis = async (req, res) => {
    var uuid = req.params.uuid;

    const render = {
        objects: []
    };

    render.objects.push({
        key: 'trendAnalysis',
        name: 'trendAnalysis',
        uri: `${process.env.API_TREND_ANALYSIS}/script/${uuid}`,
        method: 'GET',
        data: {queryParams: req.body.queryParams}
    });

    let responses = await API.ajax(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        res.json(render);
    } else {
        res.json({msg: 'An unknown error has occurred. Please contact us.'});
    }
};
