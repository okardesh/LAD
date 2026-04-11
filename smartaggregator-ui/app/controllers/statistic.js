const markdown = require("markdown").markdown;

const API = require('../rest/api');

const endpoints = {
    "acct-placed-collaterals": {
        title: "Acct Placed Collaterals",
        table: "SUB_ACCT_PLACED_COLLATERAL"
    },
    "asset-items": {
        title: "Asset Items",
        table: "SUB_ASSET_ITEM"
    },
    "collaterals": {
        title: "Collaterals",
        table: "SUB_COLLATERAL"
    },
    "customers": {
        title: "Customers",
        table: "SUB_CUSTOMERS"
    },
    "degrees": {
        title: "Ratings",
        table: "SUB_DEGREE"
    },
    "fx-futures": {
        title: "Fx Futures",
        table: "SUB_FX_FUTURES"
    },
    "netting-agreements": {
        title: "Netting Agreements",
        table: "SUB_NETTING_AGREEMENT"
    },
    "liability-items": {
        title: "Liabilities",
        table: "SUB_LIABILITY_ITEM"
    },
    "off-balance-sheets": {
        title: "Off Balance Sheets",
        table: "SUB_OFF_BALANCE_SHEET"
    },
    "options": {
        title: "Options",
        table: "SUB_OPTION"
    },
    "payment-schedules": {
        title: "Payment Schedules",
        table: "SUB_PAYMENT_SCHEDULE"
    },
    "repos": {
        title: "Repos",
        table: "SUB_REPO"
    },
    "securities": {
        title: "Securities",
        table: "SUB_SECURITY"
    },
    "swaps": {
        title: "Swaps",
        table: "SUB_SWAP"
    },
    "asset-accs": {
        title: "asset-accs",
        table: "SUB_ASSET_ACC"
    },
    "liability-accs": {
        title: "liability-accs",
        table: "SUB_LIABILITY_ACC"
    },
    "off-balance-sheet-accs": {
        title: "off-balance-sheet-accs",
        table: "SUB_OFF_BALANCE_SHEET_ACC"
    },
    "intragroup-transactions": {
        title: "intragroup-transactions",
        table: "SUB_INTRAGROUP_TRANSACTION"
    },
    "net-exposures": {
        title: "net-exposures",
        table: "SUB_NET_EXPOSURE"
    },
    "ciu-fund-infos": {
        title: "ciu-fund-infos",
        table: "SUB_CIU_FUND_INFO"
    },
    "ciu-fund-components": {
        title: "ciu-fund-components",
        table: "SUB_CIU_FUND_COMPONENT"
    },
    "currency-tables": {
        title: "currency-tables",
        table: "SUB_CURRENCY_TABLE"
    }
};

exports.getTableStatistics = async (req, res) => {
    const page = req.params.table;

    if (endpoints.hasOwnProperty(page)) {
        const year = req.params.year,
            permissionErrors = [],
            responses = {},
            paths = [];

        paths.push({uri: `${process.env.API_STATISTIC}/` + endpoints[page].table, method: 'GET', data: {year: year}});

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
            res.render('pages/statistics', {
                title: endpoints[page].title,
                url: '/' + page,
                response: responses[`${process.env.API_STATISTIC}/` + endpoints[page].table],
                year: year,
                info: markdown.toHTML(req.__('info.statistics')),
                screenCode: endpoints[page].table

            });
        } else {
            return res.redirect('/500');
        }
    } else {
        return res.redirect('/500');
    }
};

exports.getStatisticByType =  async (req, res) => {
    const type = req.params.type;

    const render = {
        objects: []
    };

    render.objects.push({
        key: 'statistics',
        name: 'statistics',
        uri: `${process.env.API_STATISTIC}/${type}`,
        method: 'GET',
        data: req.body
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

exports.getReportDetail = async (req, res) => {
    const render = {
        objects: [{
            key: 'detail',
            name: 'statistics',
            uri: `${process.env.API_STATISTIC}/report/detail`,
            method: 'GET',
            data: {
                subsidiary: req.body.subsidiary,
                reportDate: req.body.reportDate,
                reportType: req.body.reportType
            }
        }]
    };

    let responses = await API.ajax(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        res.json(render);
    } else {
        res.json({msg: 'An unknown error has occurred. Please contact us.'});
    }
};
