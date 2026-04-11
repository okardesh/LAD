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

exports.getRuleErrors = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_SUBSIDIARY_LIMITED}`, method: 'GET', data: {}});
    paths.push({uri: `${process.env.API_RULE_ERRORS}`, method: 'GET', data: req.query.q});

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
        res.render('pages/ruleErrors', {
            title: 'RuleErrors',
            ruleErrorsList: responses[`${process.env.API_RULE_ERRORS}`].ruleErrorsList,
            tableNameList: tables,
            subsidiaryList: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.ruleErrors'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.getRuleError = async (req, res) => {
    const uuid = req.params.uuid,
        permissionErrors = [],
        responses = {},
        paths = [];
    paths.push({uri: `${process.env.API_RULE_ERRORS}/${uuid}`, method: 'GET', data: req.query.q});

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
        res.render('pages/ruleError', {
            title: 'RuleError',
            ruleError: responses[`${process.env.API_RULE_ERRORS}/${uuid}`].ruleError,
            info: markdown.toHTML(req.__('info.ruleError'))
        });
    } else {
        return res.redirect('/500');
    }
};
