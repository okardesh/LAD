const XLSX = require('xlsx');
const path = require('path');
const camelcaseKeys = require('camelcase-keys');
const markdown = require("markdown").markdown;
const csv = require("csvtojson");
const fs = require('fs');
const uuidv4 = require('uuid/v4');

const API = require('../rest/api');

function toCamelCase(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

function toTitleCase(str) {
    return str.replace('\-', ' ').replace(/\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function validator(file) {
    if (!file) return "No File Selected";
    
    file.filename = uuidv4() + path.extname(file.originalname);

    if (!`${process.env.ACCEPTABLE_FILE_TYPE}`.split(',').includes(path.extname(file.filename).split('.').pop())) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_FILE_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

const endpoints = [
    {
        plural: "acct-placed-collaterals",
        singular: "acct-placed-collateral",
        args: {
            table: "SUB_ACCT_PLACED_COLLATERAL",
            api: "API_ACCTPLACEDCOLLATERAL",
        }
    }, {
        plural: "asset-items",
        singular: "asset-item",
        args: {
            table: "SUB_ASSET_ITEM",
            api: "API_ASSET_ITEM",
        }
    }, {
        plural: "collaterals",
        singular: "collateral",
        args: {
            table: "SUB_COLLATERAL",
            api: "API_COLLATERAL",
        }
    }, {
        plural: "customers",
        singular: "customer",
        args: {
            table: "SUB_CUSTOMERS",
            api: "API_CUSTOMERS",
        }
    }, {
        plural: "degrees",
        singular: "degree",
        args: {
            table: "SUB_DEGREE",
            api: "API_DEGREE",
        }
    }, {
        plural: "fx-futures",
        singular: "fx-future",
        args: {
            table: "SUB_FX_FUTURES",
            api: "API_FXFUTURE",
        }
    }, {
        plural: "netting-agreements",
        singular: "netting-agreement",
        args: {
            table: "SUB_NETTING_AGREEMENT",
            api: "API_NETTINGAGREEMENT",
        }
    }, {
        plural: "liability-items",
        singular: "liability-item",
        args: {
            table: "SUB_LIABILITY_ITEM",
            api: "API_LIABILITY_ITEM",
        }
    }, {
        plural: "off-balance-sheets",
        singular: "off-balance-sheet",
        args: {
            table: "SUB_OFF_BALANCE_SHEET",
            api: "API_OFFBALANCESHEET",
        }
    }, {
        plural: "options",
        singular: "option",
        args: {
            table: "SUB_OPTION",
            api: "API_OPTION",
        }
    }, {
        plural: "payment-schedules",
        singular: "payment-schedule",
        args: {
            table: "SUB_PAYMENT_SCHEDULE",
            api: "API_PAYMENTSCHEDULE",
        }
    }, {
        plural: "repos",
        singular: "repo",
        args: {
            table: "SUB_REPO",
            api: "API_REPO",
        }
    }, {
        plural: "securities",
        singular: "security",
        args: {
            table: "SUB_SECURITY",
            api: "API_SECURITY",
        }
    }, {
        plural: "swaps",
        singular: "swap",
        args: {
            table: "SUB_SWAP",
            api: "API_SWAP",
        }
    }, {
        plural: "asset-accs",
        singular: "asset-acc",
        args: {
            table: "SUB_ASSET_ACC",
            api: "API_ASSET_ACC",
        }
    }, {
        plural: "liability-accs",
        singular: "liability-acc",
        args: {
            table: "SUB_LIABILITY_ACC",
            api: "API_LIABILITY_ACC",
        }
    }, {
        plural: "off-balance-sheet-accs",
        singular: "off-balance-sheet-acc",
        args: {
            table: "SUB_OFF_BALANCE_SHEET_ACC",
            api: "API_OFF_BALANCE_SHEET_ACC",
        }
    }, {
        plural: "intragroup-transactions",
        singular: "intragroup-transaction",
        args: {
            table: "SUB_INTRAGROUP_TRANSACTION",
            api: "API_INTRAGROUP_TRANSACTION",
        }
    }, {
        plural: "net-exposures",
        singular: "net-exposure",
        args: {
            table: "SUB_NET_EXPOSURE",
            api: "API_NET_EXPOSURE",
        }
    }, {
        plural: "ciu-fund-infos",
        singular: "ciu-fund-info",
        args: {
            table: "SUB_CIU_FUND_INFO",
            api: "API_CIU_FUND_INFO",
        }
    }, {
        plural: "ciu-fund-components",
        singular: "ciu-fund-component",
        args: {
            table: "SUB_CIU_FUND_COMPONENT",
            api: "API_CIU_FUND_COMPONENT",
        }
    },
    {
        plural: "currency-tables",
        singular: "currency-table",
        args: {
            table: "SUB_CURRENCY_TABLE",
            api: "API_CURRENCY_TABLE",
        }
    }
];

exports.getList = async (req, res) => {
    req.session.item = null;

    const url = req.route.path.split('/'),
        endpoint = endpoints.find(o => url.includes(o.plural) || url.includes(o.singular));
    let search = req.body.search;

    const permissionErrors = [],
        responses = {},
        paths = [];

    if (endpoint) {
        if (!req.session.hasOwnProperty('table'))
            req.session.table = {};
        let table = req.session.table[endpoint.args.table];

        if (!table)
            paths.push({uri: `${process.env.API_SYSTEM}/` + endpoint.args.table, method: 'GET', data: {}});
        paths.push({uri: `${process.env[endpoint.args.api]}`, method: 'GET', data: req.query.q});

        for (const p of paths) {
            let data = await API.requestAsync(p.uri, p.method, p.data, req, res);

            if (data && data.statusCode === 403)
                permissionErrors.push(p.uri);
            else if (data && data.statusCode === 200)
                responses[p.uri] = data;
        }

        if (permissionErrors.length > 0) {
            res.redirect('/403');
        } else if (Object.keys(responses).length === paths.length) {
            if (responses.hasOwnProperty(`${process.env.API_SYSTEM}/` + endpoint.args.table)) {
                table = responses[`${process.env.API_SYSTEM}/` + endpoint.args.table].table.columns;
                req.session.table[endpoint.args.table] = table;
            }
            res.render('pages/configuratorList', {
                columns: table,
                items: responses[`${process.env[endpoint.args.api]}`][toCamelCase(endpoint.plural)],
                info: markdown.toHTML(req.__('info.' + toCamelCase('sub-' + endpoint.plural))),
                title: toTitleCase(endpoint.plural),
                uri: `${process.env[endpoint.args.api]}`,
                detail: endpoint.singular,
                screenCode: endpoint.args.table,
                search: search
            });
        } else {
            return res.redirect('/500');
        }
    } else {
        return res.redirect('/500');
    }
};

exports.postList = async (req, res, next) => {
    req.session.item = null;

    const url = req.route.path.split('/'),
        endpoint = endpoints.find(o => url.includes(o.plural) || url.includes(o.singular));
    const body = req.body,
        action = body.action;

    if (endpoint) {
        if ('new' === action) {
            return res.redirect('/' + endpoint.singular + '/new');
        } else if ('import' === action) {
            const file = req.file,
                invalid = validator(file);

            if (invalid) {
                req.flash('errors', {msg: invalid});
                return res.redirect('/' + endpoint.plural);
            } else {
                let json, headers;
                if ('csv' === path.extname(file.filename).split('.').pop()) {
                    json = await csv({delimiter: 'auto', ignoreEmpty: true})
                        .on('header', (header) => {headers = header.filter(Boolean)})
                        .fromString(file.buffer.toString());
                } else {
                    const wb = XLSX.read(file.buffer, {type: 'buffer', dateNF: 'dd/mm/yyyy'});
                    json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
                        raw: false,
                        columns: true,
                        skipHeader: false
                    });
                    headers = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1})[0];
                }
                body.batchId = path.parse(file.filename).name;

                let response = await API.requestAsync(`${process.env.API_SYSTEM}/${endpoint.args.table}`, 'GET', {}, req, res);
                if (response && response.statusCode === 200) {
                    let dbSubTableColumns = response.table.columns.filter(x => x.flag === "1").map(x => toCamelCase(x.name).toLowerCase()),
                        difference = headers.map(x => toCamelCase(x).toLowerCase()).filter(x => !dbSubTableColumns.includes(x));
                    if (difference.length > 0) {
                        req.flash('errors', {msg: req.__('Data formatting not correct').concat(difference.join(", "))});
                        return res.redirect('/' + endpoint.plural);
                    }
                }

                let request = {
                    uri: `${process.env[endpoint.args.api]}`,
                    method: 'POST',
                    data: {
                        reportDate: body.reportDate,
                        reportType: body.reportType,
                        batchId: body.batchId
                    }
                };
                request.data[toCamelCase(endpoint.plural)] = camelcaseKeys(json);

                let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

                if (data && data.statusCode === 403) {
                    return res.redirect('/403');
                } else if (data && data.statusCode === 208) {
                    req.flash('info', {
                        msg: 'BusinessUnit',
                        params: [req.__(body.reportType), body.reportDate],
                    });
                    return res.redirect('/' + endpoint.plural);
                } else if (data && data.statusCode === 405) {
                    req.flash('modal', {
                        msg: 'DeadlineExpired',
                        params: [req.__(data.reportType), data.reportDate],
                        uuid: data.error,
                        type: 'deadline'
                    });
                    return res.redirect('/' + endpoint.plural);
                } else if (data && data.statusCode === 406) {
                    req.flash('info', {
                        msg: '# report of # was approved. When your existing report is rejected, you can re-submit a report.',
                        params: [{name: "reportType", value: req.__(body.reportType)}, {
                            name: "reportDate",
                            value: body.reportDate
                        }],
                        // params: [req.__(body.reportType), body.reportDate],
                        isNew: true

                    });
                    req.flash('info', {msg: 'You cannot enter data after the report is approved.'});
                    return res.redirect('/' + endpoint.plural);
                } else if (data && data.statusCode !== 500 && data.error) {
                    req.flash('errors', {msg: data.error});
                    return res.redirect('/' + endpoint.plural);
                } else if (data && data.statusCode === 200) {
                    req.flash('info', {
                        msg: '# row(s) have been processed. The result will be sent via e-mail.',
                        params: [json.length]
                    });
                    return res.redirect('/' + endpoint.plural);
                } else {
                    req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                    return res.redirect('/' + endpoint.plural);
                }
            }
        } else if ('deadline' === action) {
            let data = await API.requestAsync(`${process.env.API_DEADLINE}/${body.uuid}/waiting`, 'PUT', {
                deadline: {
                    description: body.description,
                    reason: body.reason
                }
            }, req, res);

            if (data && data.statusCode === 403) {
                return res.redirect('/403');
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect('/' + endpoint.plural);
            } else if (data && data.statusCode === 200) {
                req.flash('success', {msg: 'Your data entry request has been sent to the Business Unit.'});
                return res.redirect('/' + endpoint.plural);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect('/' + endpoint.plural);
            }
        } else if ('filter' === action) {
            this.getList(req, res, next)
        } else {
            return res.redirect('/' + endpoint.plural);
        }
    } else {
        return res.redirect('/500');
    }
};

exports.get = async (req, res) => {
    let item = req.session.item;
    const uuid = req.params.uuid;

    const url = req.route.path.split('/'),
        endpoint = endpoints.find(o => url.includes(o.plural) || url.includes(o.singular));

    if (uuid === 'new' && !req.user.includeToSingleton) {
        req.flash('errors', {msg: 'Individual record saving and updating is disabled for this subsidiary.'});
        return res.redirect('/' + endpoint.plural);
    }

    const permissionErrors = [],
        responses = {},
        paths = [];

    if (endpoint) {
        if (!req.session.hasOwnProperty('table'))
            req.session.table = {};
        let table = req.session.table[endpoint.args.table];

        if (!table)
            paths.push({uri: `${process.env.API_SYSTEM}/` + endpoint.args.table, method: 'GET', data: {}});
        if ('new' !== uuid && !item)
            paths.push({uri: `${process.env[endpoint.args.api]}/${uuid}`, method: 'GET', data: {}});

        for (const p of paths) {
            let data = await API.requestAsync(p.uri, p.method, p.data, req, res);

            if (data && data.statusCode === 403)
                permissionErrors.push(p.uri);
            else if (data && data.statusCode === 200)
                responses[p.uri] = data;
        }

        if (permissionErrors.length > 0) {
            req.flash('error', {permissionErrors: permissionErrors});
            res.redirect('/403');
        } else if (Object.keys(responses).length === paths.length) {
            if (responses.hasOwnProperty(`${process.env.API_SYSTEM}/` + endpoint.args.table)) {
                table = responses[`${process.env.API_SYSTEM}/` + endpoint.args.table].table.columns;
                req.session.table[endpoint.args.table] = table;
            }
            item = responses.hasOwnProperty(`${process.env[endpoint.args.api]}/${uuid}`) ? responses[`${process.env[endpoint.args.api]}/${uuid}`][toCamelCase(endpoint.singular)] : (item ? item : {});
            res.render('pages/configurator', {
                columns: table,
                item: item,
                info: markdown.toHTML(req.__('info.' + toCamelCase('sub-' + endpoint.singular))),
                title: toTitleCase(endpoint.singular),
                list: endpoint.plural,
                screenCode: endpoint.args.table,
            });
        } else {
            return res.redirect('/500');
        }
    } else {
        return res.redirect('/500');
    }
};

exports.post = async (req, res, next) => {
    const url = req.route.path.split('/'),
        endpoint = endpoints.find(o => url.includes(o.plural) || url.includes(o.singular));

    const uuid = req.params.uuid;
    let body = req.body,
        action = body.action;

    body.status = body.status === 'on' ? 1 : 2;

    if ('new' === action) {
        req.session.item = null;
        return res.redirect('/' + endpoint.singular + '/new');
    } else if ('deadline' === action) {
        let data = await API.requestAsync(`${process.env.API_DEADLINE}/${body.uuid}/waiting`, 'PUT', {
            deadline: {
                description: body.description,
                reason: body.reason
            }
        }, req, res);

        if (data && data.statusCode === 403) {
            return res.redirect('/403');
        } else if (data && data.error) {
            req.flash('errors', {msg: data.error});
            return res.redirect('/' + endpoint.plural);
        } else if (data && data.statusCode === 200) {
            req.flash('success', {msg: 'Your data entry request has been sent to the Business Unit.'});
            return res.redirect('/' + endpoint.plural);
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect('/' + endpoint.plural);
        }
    } else {
        req.session.item = body;

        let request = {
            data: {}
        };

        if ('delete' !== action) request.data[toCamelCase(endpoint.singular)] = body;

        switch (action) {
            case 'save':
                request = {uri: `${process.env[endpoint.args.api]}`, method: 'POST', data: request.data};
                break;
            case 'update':
                request = {uri: `${process.env[endpoint.args.api]}/${uuid}`, method: 'PUT', data: request.data};
                break;
            case 'delete':
                request = {uri: `${process.env[endpoint.args.api]}/${uuid}`, method: 'DELETE', data: {}};
                break;
            default:
                return res.redirect(req.path);
        }

        let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

        if (data && data.statusCode === 403) {
            return res.redirect('/403');
        } else if (data && data.statusCode === 208) {
            req.session.item = null;
            req.flash('info', {
                msg: 'Business Unit approval is expected for the # report entry dated #. When it is approved, you can enter report.',
                params: [body.reportType, body.reportDate],
            });
            return res.redirect(req.path);
        } else if (data && data.statusCode === 405) {
            req.session.item = null;
            req.flash('modal', {
                msg: "The # report of # deadline period has expired. Would you like to make a request for registration entry?",
                params: [data.reportType, data.reportDate],
                uuid: data.error,
                type: 'deadline'
            });
            return res.redirect(req.path);
        } else if (data && data.statusCode === 406) {
            req.session.item = null;
            req.flash('info', {
                msg: 'The # report of # was approved. When your existing report is rejected, you can re-submit a report.',
                params: [body.reportType, body.reportDate],
            });
            return res.redirect('/' + endpoint.plural);
        } else if (data && data.error) {
            req.flash('errors', {msg: data.error});
            return res.redirect(req.path);
        } else if (data && data.statusCode === 200) {
            req.session.item = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('update' === action ? req.path : ('/' + endpoint.plural));
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }
    }

};
