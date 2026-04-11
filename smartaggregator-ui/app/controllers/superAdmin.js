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

exports.getSelectFields = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];

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
        res.render('pages/superAdmin', {
            title: 'Super Admin',
            tableNameList: tables,
            subsidiaries: responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited,
            info: markdown.toHTML(req.__('info.superAdmin'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.post = async (req, res, next) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    let request = {};


    switch (action) {
        case 'copyRule':
            request = {
                uri: `${process.env.API_SUPER_ADMIN}/rule`,
                method: 'POST',
                data: {
                    subsidiaries: [{
                        subsidiary: body.sourceSubsidiaryRule,
                        status: 0
                    }, {subsidiary: body.targetSubsidiaryRule, status: 1}]
                }
            };
            break;
        case 'changeSubCode':
            request = {
                uri: `${process.env.API_SUPER_ADMIN}/code`, method: 'POST', data: {
                    subsidiaries: [{subsidiary: body.sourceSubsidiary, status: 0}],
                    subsidiaryCode: body.targetSubsidiaryCode
                }
            };
            break;
        case 'reconciliationCopy':
            request = {
                uri: `${process.env.API_SUPER_ADMIN}/reconciliation`,
                method: 'POST',
                data: {
                    subsidiaries: [{
                        subsidiary: body.sourceSubsidiaryReconciliation,
                        status: 0
                    }, {subsidiary: body.targetSubsidiaryReconciliation, status: 1}]
                }
            };
            break;
        case 'deleteTable':
            request = {
                uri: `${process.env.API_SUPER_ADMIN}/table`,
                method: 'DELETE',
                data: {
                    subsidiaries: [{subsidiary: body.subsidiary_table, status: 0}],
                    reportType: body.reportType_table,
                    reportDate: body.reportDate_table,
                    tableName: body.tableName_del
                }
            };
            break;
        default:
            break;
    }

    let data = await API.requestAsync(request.uri, request.method, request.data, req, res);
    if (data && data.statusCode === 403) {
        return res.redirect('/403');
    } else if (data && data.statusCode === 406) {
        req.flash('errors', {msg: req.__(data.error)});
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
