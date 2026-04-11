const markdown = require("markdown").markdown;
const API = require('../rest/api');
const path = require('path');
const s3 = require('../config/s3config');

const fileTypes = [".xls", ".xlsx", ".doc", ".docx", ".pdf", ".txt", ".pptx", ".ppt", ".pps", ".txt"];
const screenCodeList = ["SUB_ASSET_ITEM", "SUB_ACCT_PLACED_COLLATERAL", "SUB_COLLATERAL", "SUB_CUSTOMERS",
    "SUB_DEGREE", "SUB_FX_FUTURES", "SUB_NETTING_AGREEMENT", "SUB_LIABILITY_ITEM",
    "SUB_OFF_BALANCE_SHEET", "SUB_OPTION", "SUB_PAYMENT_SCHEDULE",
    "SUB_REPO", "SUB_SECURITY", "SUB_SWAP", "SUB_ASSET_ACC", "SUB_LIABILITY_ACC", "SUB_OFF_BALANCE_SHEET_ACC",
    "SUB_INTRAGROUP_TRANSACTION", "SUB_NET_EXPOSURE", "SUB_CIU_FUND_INFO",
    "SUB_CIU_FUND_COMPONENT", "SUB_CURRENCY_TABLE", "OPERATIONS", "USERS", "FMU", "NOTIFICATIONS", "SUBSIDIARIES", "SETTINGS", "RULES", "ROLES", "DROPDOWNS",
    "ANNOUNCEMENTS", "TABLES", "SUBSIDIARY-TABLES", "TABLE-COLUMN-MODELS", "RECONCILIATION-CHECK-ERRORS",
    "RECONCILIATION-CHECKS", "RULE-ERRORS", "DEADLINES", "PARAMETERS"];

function validator(file) {
    if (!file) return "No File Selected";

    if (!fileTypes.includes(path.extname(file.originalname))) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_DOCUMENT_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

exports.getDocuments = async (req, res, next) => {
    req.session.documents = null;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_DOCUMENTS}`, method: 'GET', data: req.query.q});

    for (const pathItem of paths) {
        let data = await API.requestAsync(pathItem.uri, pathItem.method, pathItem.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(pathItem.uri);
        else if (data && data.statusCode === 200)
            responses[pathItem.uri] = data;
    }
    if (permissionErrors.length > 0) {
        req.flash('error', {permissionErrors: permissionErrors});
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        res.render('pages/documents', {
            title: 'Documents',
            documents: responses[`${process.env.API_DOCUMENTS}`].documents,
            screenCodeList : screenCodeList,
            info: markdown.toHTML(req.__('info.documents'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postDocuments = (req, res, next) => {
    return res.redirect('/document/new');
};

exports.getDocument = async (req, res, next) => {

    let _document_ = req.session._document,
        uuid = req.params.uuid;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({
        uri: `${process.env.API_SUBSIDIARY_LIMITED}`,
        method: 'GET',
        data: {}
    });

    if ('new' !== uuid) {
        paths.push({
            uri: `${process.env.API_DOCUMENTS}/${uuid}`,
            method: 'GET',
            data: {}
        });
    }

    for (const pathItem of paths) {
        let data = await API.requestAsync(pathItem.uri, pathItem.method, pathItem.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(pathItem.uri);
        else if (data && data.statusCode === 200)
            responses[pathItem.uri] = data;
    }

    if (permissionErrors.length > 0) {
        req.flash('error', {
            permissionErrors: permissionErrors
        });
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        if (responses.hasOwnProperty(`${process.env.API_DOCUMENTS}/${uuid}`)) {
            _document_ = responses[`${process.env.API_DOCUMENTS}/${uuid}`].document;
        } else if (!_document_) _document_ = {
            subsidiaries: [], organizationView: 1
        };

        let subsidiaries = responses.hasOwnProperty(`${process.env.API_SUBSIDIARY_LIMITED}`) ? responses[`${process.env.API_SUBSIDIARY_LIMITED}`].subsidiariesLimited : {};
        res.render('pages/document', {
            title: 'Document',
            document: _document_,
            subsidiaries: subsidiaries,
            screenCodes: screenCodeList,
            info: markdown.toHTML(req.__('info.document'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postDocument = async (req, res, next) => {
    req.session._document_ = null;
    let body = req.body,
        action = body.action,
        uuid = body.uuid,
        file = req.file,
        request = {};

    if (file) {
        req.body.document = file.key;
        let invalid = validator(file);

        if (invalid) {
            req.flash('errors', {msg: invalid});
            return res.redirect(req.path);
        }
    }

    if ('new' === action) {
        req.session._document_ = null;
        return res.redirect('/document/new');
    } else {
        req.session._document_ = body;

        switch (action) {
            case "save":
                body.organizationView = body.organizationView === 'on' ? 1 : 0;
                body.status = body.status === 'on' ? 1 : 2;
                body.subsidiaries = !body.subsidiaries ? [] : (!Array.isArray(body.subsidiaries) ? [body.subsidiaries] : body.subsidiaries);
                request = {uri: `${process.env.API_DOCUMENTS}`, method: 'POST', data: {document: body}};
                break;
            case "update":
                body.organizationView = body.organizationView === 'on' ? 1 : 0;
                body.status = body.status === 'on' ? 1 : 2;
                body.subsidiaries = !body.subsidiaries ? [] : (!Array.isArray(body.subsidiaries) ? [body.subsidiaries] : body.subsidiaries);
                request = {uri: `${process.env.API_DOCUMENTS}/${uuid}`, method: 'PUT', data: {document: body}};
                break;
            case "delete":
                request = {uri: `${process.env.API_DOCUMENTS}/${uuid}`, method: 'DELETE', data: {}};
                break;
            default :
                return res.redirect(req.path);
        }

        let data = await API.requestAsync(request.uri, request.method, request.data, req, res);

        if (data && data.statusCode === 403) {
            return res.redirect('/403');
        } else if (data && data.statusCode === 409) {
            req.flash('errors', {
                msg: 'You cannot confirm your own registration.'
            });
            return res.redirect(req.path);
        } else if (data && data.error) {
            req.flash('errors', {
                msg: data.error
            });
            return res.redirect(req.path);
        } else if (data && data.statusCode === 200) {

            req.session._document_ = null;
            req.flash('success', {
                msg: 'The operation completed successfully.'
            });
            return res.redirect('update' === action ? req.path : '/documents');
        } else {
            req.flash('errors', {
                msg: 'An unknown error has occurred. Please contact us.'
            });
            return res.redirect(req.path);
        }
    }
};

exports.getDocumentFiles = async (req, res) => {
    req.session.documents = null;

    let screenCode = req.params.screenCode;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_DOCUMENTS}/files/${screenCode}`, method: 'GET', data: {}});

    for (const pathItem of paths) {
        let data = await API.requestAsync(pathItem.uri, pathItem.method, pathItem.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(pathItem.uri);
        else if (data && data.statusCode === 200)
            responses[pathItem.uri] = data;
    }


    if (permissionErrors.length > 0) {
        req.flash('error', {permissionErrors: permissionErrors});
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        const documents = responses[`${process.env.API_DOCUMENTS}/files/${screenCode}`].documentsLimited;
        res.render('pages/documentFiles', {
            title: 'documentFiles',
            documents: documents,
            info: markdown.toHTML(req.__('info.documentfiles'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.downloadDocument = async (req, res, next) => {
    const name = req.params.fileName;
    if (name) {
        res.attachment(req.params.code + path.extname(name));
        s3.params.Key = name;
        s3.config.getObject(s3.params).createReadStream().pipe(res);
    } else {
        return res.redirect('/500');
    }
};
