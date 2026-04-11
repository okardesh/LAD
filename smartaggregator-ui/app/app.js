//
//v1.0.23
//
/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const flash = require('express-flash');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const cookieParser = require('cookie-parser');
const i18n = require("i18n");
const swaggerUi = require('swagger-ui-express');
const crypto = require('crypto');
const moment = require('moment');
const useragent = require('express-useragent');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid/v4');
const multer = require('multer');
const multerS3 = require('multer-s3');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
var environment = process.env.NODE_ENV || 'production';

if (environment && (environment == 'dev' || environment == 'development')) {
    dotenv.load({
        path: 'env/dev.env'
    });
} else {
    dotenv.load({
        path: 'env/prd.env'
    });
}

var upload = multer({
    storage: multer.memoryStorage()
});

const s3 = require('./config/s3config.js');

var aws = multer({
    storage: multerS3({
        s3: s3.config,
        bucket: s3.params.Bucket,
        key: function (req, file, cb) {
            cb(null, uuidv4() + path.extname(file.originalname));
        }
    })
});

/**
 * Rest API
 */
const API = require('./rest/api');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Controllers (route handlers).
 */
const loginController = require('./controllers/login');
const usersController = require('./controllers/users');
const rolesController = require('./controllers/roles');
const applicationLogsController = require('./controllers/applicationLogs');
const apiLogsController = require('./controllers/apiLogs');
const parametersController = require('./controllers/parameters');
const messagesController = require('./controllers/messages');
const operationsController = require('./controllers/operations');
const rulesController = require('./controllers/rules');
const ruleErrorsController = require('./controllers/ruleErrors');
const reconciliationChecksController = require('./controllers/reconciliationChecks');
const reconciliationCheckErrorsController = require('./controllers/reconciliationCheckErrors');
const deadlineController = require('./controllers/deadline');
const requestsController = require('./controllers/requests');
const requestsApprovalController = require('./controllers/requestApprovals')
const systemController = require('./controllers/system');
const companyController = require('./controllers/company');
const subsidiaryTablesController = require('./controllers/subsidiaryTables');
const dropdownsController = require('./controllers/dropdowns');
const tableColumnModelsController = require('./controllers/tableColumnModels');
const documentController = require("./controllers/document");
const financialManagementController = require("./controllers/financialManagement");
const trendAnalysisController = require("./controllers/trendAnalysis");
const notificationController = require('./controllers/notifications');
const statisticController = require('./controllers/statistic');
const announcementController = require('./controllers/announcements');
const organizationController = require('./controllers/organization');
const configurator = require('./controllers/configurator');
const superAdmin = require('./controllers/superAdmin');
const settingsController = require('./controllers/settings');
const rpaDashboardController = require('./controllers/rpa-dashboard');
const robotListController = require('./controllers/data-list');
const companiesListController = require('./controllers/companies-list')
const jobsController = require('./controllers/jobs');
const dailyIntensitiesController = require('./controllers/dailyIntensities');
const robotsController = require('./controllers/robots.js');
const graphSettingController = require("./controllers/graphSettings.js")
const queueController = require('./controllers/queue');

/**
 * Create Express server.
 */
const app = express();

/**
 * i18n configure
 */
var acceptedLocales = ['tr', 'en'];
i18n.configure({
    locales: acceptedLocales,
    defaultLocale: process.env.DEFAULT_LOCALE,
    directory: __dirname + '/locales',
    queryParameter: 'lang',
    cookie: '_locale',
    updateFiles: false,
    autoReload: true
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('timeout', process.env.TIMEOUT || 600000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(sass({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public')
}));
app.use(useragent.express());

app.enable('trust proxy');

app.use((req, res, next) => {
    const start = moment().format('DD-MM-YYYY HH:mm');
    const requestStart = Date.now();

    let errorMessage = null;
    // let body = [];
    /*
    req.on("data", chunk => {
        body.push(chunk);
    });
    req.on("end", () => {
        body = Buffer.concat(body);
        body = body.toString();
    });
    */
    req.on("error", (error) => {
        errorMessage = error;
    });
    res.on("finish", () => {
        if (errorMessage) {
            const {
                rawHeaders,
                httpVersion,
                method,
                socket,
                url
            } = req;
            const {
                remoteAddress,
                remoteFamily
            } = socket;

            console.log(">>>>>>>>>>>>>>>>>>>>");
            console.log(JSON.stringify({
                start,
                end: moment().format('DD-MM-YYYY HH:mm'),
                time: (Date.now() - requestStart) + 'ms',
                rawHeaders,
                httpVersion,
                remoteAddress,
                remoteFamily,
                //body: body.length > 0 ? 'true' : 'false',
                method,
                url
            }));
            console.error("ERROR: ", errorMessage);
            console.log("<<<<<<<<<<<<<<<<<<<<");
        }
    });
    next();
});
app.get("*", (req, res, next) => {
    if (!req.useragent || (!req.useragent.isMobile && !req.useragent.isEdge && !req.useragent.isChrome && !req.useragent.isFirefox)) {
        if ('/browser-not-supported' != req.path) return res.redirect('/browser-not-supported');
    }

    /**
     * organize query
     */
    var query = {
        limit: process.env.PAGINATION_LIMIT
    };
    if (req.query.q) query = JSON.parse(decodeURIComponent(req.query.q));
    req.query.q = query;
    res.locals.query = query;
    /**
     * organize luc
     */
    var luc = 0;
    if (req.query.luc) luc = req.query.luc;
    req.query.luc = luc;
    res.locals.luc = luc;
    next();
});

app.use(logger('dev'));
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
}));
app.use(expressValidator());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {
        maxAge: 1209600000
    }, // two weeks in milliseconds
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use(cookieParser());
app.use(i18n.init);
app.use((req, res, next) => {
    var locale = req.cookies['_locale'];

    if (!locale) {
        locale = process.env.DEFAULT_LOCALE;
    }
    if (req.query &&
        req.query.lang &&
        acceptedLocales.includes(req.query.lang)) {
        locale = req.query.lang;
    }

    res.cookie('_locale', locale, {
        maxAge: 31557600000,
        httpOnly: true
    });
    res.setLocale(locale);
    next();
});
app.use('/', express.static(path.join(__dirname, 'public'), {
    maxAge: 31557600000
}));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), {
    maxAge: 31557600000
}));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), {
    maxAge: 31557600000
}));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), {
    maxAge: 31557600000
}));
app.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), {
    maxAge: 31557600000
}));
app.use('/uploads', express.static(process.env.UPLOAD_FOLDER, {
    maxAge: 31557600000
}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
    swaggerUrl: process.env.API_DOCS
}));
app.use(function (req, res, next) {
    res.locals.i18n = i18n.getCatalog(res.getLocale() || process.env.DEFAULT_LOCALE);
    res.locals.status = function (status) {
        switch (status) {
            case 1:
                return '1-' + req.__('Active');
            case 2:
                return '2-' + req.__('Passive');
            case 3:
                return '3-' + req.__('Updated');
            case 9:
                return '9-' + req.__('Deleted');
            case 'N':
                return 'N-' + req.__('NewApproval');
            case 'W':
                return 'W-' + req.__('Waiting Approval');
            case 'C':
                return 'C-' + req.__('Canceled');
            case 'A':
                return 'A-' + req.__('Approved');
            case 'R':
                return 'R-' + req.__('Rejected');
            case 'I':
                return 'I-' + req.__('Inspected');
            default:
                return status;
        }
    };
    res.locals.roleFeatureType = function getRoleFeatureType(featureType) {
        switch (featureType) {
            case 1:
                return req.__('Entrant');
            case 2:
                return req.__('Approver');
            default:
                return featureType;
        }
    }
    res.locals.statusNewApprovalChange = function (status) {
        switch (status) {
            case 1:
                return '1-' + req.__('Active');
            case 2:
                return '2-' + req.__('Passive');
            case 3:
                return '3-' + req.__('Updated');
            case 9:
                return '9-' + req.__('Deleted');
            case 'N':
                return 'N-' + req.__('New');
            case 'W':
                return 'W-' + req.__('Waiting Approval');
            case 'C':
                return 'C-' + req.__('Canceled');
            case 'A':
                return 'A-' + req.__('Approved');
            case 'R':
                return 'R-' + req.__('Rejected');
            case 'I':
                return 'I-' + req.__('Inspected');
            default:
                return status;
        }
    };


    res.locals.reconciliationCheckType = function (type) {
        switch (type) {
            case 'C':
                return req.__('Cutter');
            case 'I':
                return req.__('Indicator');
            default:
                return type;
        }
    };
    res.locals.reconciliationCheckSubject = function (subject) {
        switch (subject) {
            case 'Cross Checks':
                return req.__('crossChecks');
            case 'Balance Sheet Reconciliation Checks':
                return req.__('balanceSheetReconciliationChecks');
            default:
                return subject;
        }
    };
    res.locals.uCanTrust = function (text) {
        return text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };
    res.locals.operationNotifystate = function (operationNotifystate) {
        switch (operationNotifystate) {
            case 1:
                return req.__('Active');
            case 0:
                return req.__('Passive');
            default:
                return operationNotifystate;
        }
    };


    res.locals.originalPath = function () {
        return req.baseUrl + req.path;
    };
    res.locals.activeUserAgent = req.headers['user-agent'];
    res.locals.activeUserIp = req.header('x-real-ip') || req.connection.remoteAddress;
    res.locals.nowStr = moment().format('DD-MM-YYYY HH:mm');

    getRolePermissionList(req, res, next);
});

app.locals.getCurrentYear = function () {
    return new Date().getFullYear();
};

app.locals.formatAmount = function (amount, decimalCount = 2, decimal = ".", thousands = ",") {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.error(e);
    }
};
app.locals.message = function (msg, params = [], isNew = false) {

    if (isNew) {
        return newMessage(msg, params);
    } else if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
            msg = msg.replace('#', params[i]);
        }
    }
    return msg;
};

function newMessage(msg, params) {
    if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
            msg = msg.replace('#' + params[i].name, params[i].value);
        }
    }
    return msg;
}

app.locals.hasRole = function (user, roles) {
    if (user && user.roles && roles) {
        for (let r = 0; r < roles.length; r++) {
            if (user.roles.indexOf(roles[r]) != -1) {
                return true;
            }
        }
    }
    return false;
};
app.locals.exactMatch = function (regx, str) {
    var match = str.match(regx);
    return match && str === match[0];
};
app.locals.dataType = function (dataType) {
    switch (dataType) {
        case 1:
            return '1-String';
        case 2:
            return '2-Decimal';
        case 3:
            return '3-Date';
        case 4:
            return '4-Dropdown';
        case 9:
            return '9-System'
        default:
            return dataType;
    }
};

app.use(function (req, res, next) {

    app.locals.messageType = function (messageType) {
        switch (messageType) {
            case 1:
                return req.__('Info');
            case 2:
                return req.__('Warning');
            case 3:
                return req.__('Error');
            default:
                return messageType;
        }
    }
    next();
});
app.locals.replaceCommasForDecimalFields = function (obj, decimalfields) {
    if (obj && decimalfields) {
        for (let i = 0; i < decimalfields.length; i++) {
            obj[decimalfields[i]] = obj[decimalfields[i]].replace(/,/g, '');
        }
    }
};
app.locals.getStatusColor = function (status) {
    switch (status) {

        case 0:
            return '#fdc16a';
        case 1:
            return '#22ca80';
        case 2:
            return '#fdc16a';
        case 3:
            return '#6c757d';
        case 9:
            return '#ff4f70';
        case 'N':
            return '#28a745';
        case 'W':
            return '#ffc107';
        case 'C':
            return '#343a40';
        case 'A':
            return '#007bff';
        case 'R':
            return '#dc3545';
        case 'I':
            return '#6c757d';
        default:
            return '';
    }
};

app.locals.getApprovalStatusColor = function (approvalStatus) {
    switch (approvalStatus) {

        case "N":
            return '#fdc16a';
        case "A":
            return '#22ca80';
        case "W":
            return '#4d4dff';
        case "C":
            return '#ff4f70';
        case "R":
            return '#ffa500';
        default:
            return '';
    }
};

app.locals.toUpperCamelCase = function (str) {
    let txt = str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    return txt.charAt(0).toUpperCase() + txt.substr(1);
};

app.locals.toCamelCase = function (str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

app.locals.toTitleCase = function (str) {
    return str.replace('\-', ' ').replace(/\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
};

app.use(function (req, res, next) {
    res.locals.notificationStateDisplay = function (k) {
        if (k === "N") {
            return req.__('New');
        }
        if (k === "P") {
            return req.__('Pending');
        }
        if (k === "S") {
            return req.__('Success');
        }
        if (k === "E") {
            return req.__('Error');
        }
    };
    next();
});

app.locals.formatPD = function (date, count) {
    let dateName = new Date(date.split(" ")[0].replace(/\//g, '-').split('-').reverse().join('-'));
    switch (dateName.getMonth() + count) {
        case 1:
            return 'Ocak';
        case 2:
            return 'Şubat';
        case 3:
            return 'Mart';
        case 4:
            return 'Nisan';
        case 5:
            return 'Mayıs';
        case 6:
            return 'Haziran';
        case 7:
            return 'Temmuz';
        case 8:
            return 'Ağustos';
        case 9:
            return 'Eylül';
        case 10:
            return 'Ekim';
        case 11:
            return 'Kasım';
        case 12:
            return 'Aralık';
        default:
            return '';
    }
};

app.locals.getCircleColor = function (permissionControl) {
    switch (permissionControl) {
        case 1:
            return '#22ca80';
        case 0:
            return '#FF0000';
        default:
            return '';
    }
};

app.locals.getCheckResponseExceptionColor = function (responseException) {
    switch ((responseException == null || responseException === '') ? 0 : 1) {
        case 1:
            return '#FF0000';
        case 0:
            return '#22ca80';
        default:
            return '';
    }
};

app.locals.currencyFormatter = function (currency) {
    var currencyFormat = new Intl.NumberFormat('tr-TR', {
        style: 'decimal',
        currency: 'TRY'
    });
    return currencyFormat.format(currency)
};

app.locals.formattedDate = function formatDate(date) {
      return [
          date.getDate().toString().padStart(2, '0'),
          (date.getMonth() + 1).toString().padStart(2, '0'),
          date.getFullYear(),
      ].join('/');
      };

app.locals.userCompanyID = null;

app.locals.formattedDate2 = function formatDate(date) {
return [
    date.getDate().toString().padStart(2, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getFullYear(),
].join('/');
};

app.locals.domToPdf = function printCharts() {

    var divToPrint=document.getElementById('allChartsPrint');

    var newWin=window.open('','Print-Window');

    newWin.document.open();

    newWin.document.write('<html><body onload="window.print()">'+divToPrint.innerHTML+'</body></html>');

    newWin.document.close();

    setTimeout(function(){newWin.close();},10);

};

app.locals.ChartStartDate = function formatDate(date) {
    return [
        date.getDate().toString().padStart(2, '0'),
        (date.getMonth() + 1).toString().padStart(2, '0'),
        date.getFullYear(),
    ].join('/');
    };

app.locals.ChartEndDate = function formatDate(date) {
    return [
        date.getDate().toString().padStart(2, '0'),
        (date.getMonth() + 1).toString().padStart(2, '0'),
        date.getFullYear(),
    ].join('/');
    };
      

app.locals.currencyFormatter2 = function (currency) {
    var currencyFormat2 = new Intl.NumberFormat('en-GB', {
        //maximumSignificantDigits: 3
    });
    return currencyFormat2.format(currency)
};


app.locals.responseException = function (responseException) {
    var regExp = /.+?(?=(Exception):?)/g;
    var match = regExp.exec(responseException);
    return match ? match[0] + match[1] : '';
};

app.locals.gravatar = function gravatar(email, size) {
    if (!size) {
        size = 200;
    }
    if (!email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash('md5').update(email).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};


app.locals.version = process.env.VERSION;
app.locals.versionText = process.env.VERSION_TEXT;

var getLimitedUserList = async (req, res, next) => {
    if (req && req.user && req.user.authorization) {
        let data = await API.requestAsync(`${process.env.API_USERS_LIMITED}`, 'GET', {}, req, res);

        if (data && data.statusCode == 200) {
            res.locals.userList = data.userList;
            next();
        } else {
            res.locals.userList = null;
            next();
        }
    } else {
        next();
    }
};
var getLimitedSubsidiaryList = async (req, res, next) => {
    if (req && req.user && req.user.authorization) {
        let data = await API.requestAsync(`${process.env.API_SUBSIDIARY_LIMITED}`, 'GET', {}, req, res);

        if (data && data.statusCode == 200) {
            res.locals.subsidiaryList = data.subsidiariesLimited;
            next();
        } else {
            res.locals.subsidiaryList = null;
            next();
        }
    } else {
        next();
    }
};

var getLimitedOperationList = async (req, res, next) => {
    if (req && req.user && req.user.authorization) {
        let data = await API.requestAsync(`${process.env.API_OPERATIONS_LIMITED}`, 'GET', {}, req, res);

        if (data && data.statusCode == 200) {
            res.locals.operationList = data.operationsLimited;
            next();
        } else {
            res.locals.operationList = null;
            next();
        }
    } else {
        next();
    }
};

var getDropdownList = async (req, res, next) => {
    if (req && req.user && req.user.authorization) {
        let data = await API.requestAsync(`${process.env.API_DROPDOWNS_LIMITED}`, 'GET', {
            search: [{
                key: 'status',
                operation: '=',
                value: 1
            }],
            sort: {
                asc: ['key']
            }
        }, req, res);
        if (data && data.statusCode === 200) {
            res.locals.allDropdowns = data.dropdowns;
            next();
        } else {
            res.locals.allDropdowns = null;
            next();
        }
    }
};

var getLimitedRoleList = async (req, res, next) => {
    if (req && req.user && req.user.authorization) {
        let data = await API.requestAsync(`${process.env.API_ROLES_LIMITED}`, 'GET', {}, req, res);
        if (data && data.statusCode == 200) {
            res.locals.roleList = data.rolesLimited;
            next();
        } else {
            res.locals.roleList = null;
            next();
        }
    } else {
        next();
    }
};

var getRolePermissionList = async (req, res, next) => {
    if (req && req.user && req.user.authorization && req.user.roles && req.user.roles.length > 0 && !req.user.rolePermissionAll) {
        let data = await API.requestAsync(`${process.env.API_ROLE_OPERATIONS}`, 'GET', {
            search: [{
                key: 'code',
                operation: 'in',
                value: req.user.roles.join(',')
            }]
        }, req, res);

        if (data && data.statusCode == 200) {
            res.locals.user.rolePermissionAll = data.rolePermissionAll;
            next();
        } else {
            res.locals.user.rolePermissionAll = null;
            next();
        }
    } else {
        next();
    }
};

/**
 * Primary app routes.
 */
app.get('/', passportConfig.isAuthenticated, function (req, res) {
    res.redirect('/rpa-dashboard')
});
app.get('/403', function (req, res) {
    res.render('403')
});
app.get('/404', function (req, res) {
    res.render('404')
});
app.get('/500', function (req, res) {
    res.render('500')
});
app.get('/400', function (req, res) {
    res.render('400')
});
app.get('/401', function (req, res) {
    res.render('401')
});
app.get('/browser-not-supported', function (req, res) {
    if (req.useragent && (req.useragent.isMobile || req.useragent.isEdge || req.useragent.isChrome || req.useragent.isFirefox)) {
        return res.redirect('/rpa-dashboard');
    }
    res.render('browserNotSupported')
});

app.get('/locales', (req, res) => {
    let enjson = fs.readFileSync('./locales/en.json');
    let trjson = fs.readFileSync('./locales/tr.json');
    let enunordered = JSON.parse(enjson);
    let trunordered = JSON.parse(trjson);
    let en = Object.keys(enunordered).sort().reduce(
        (obj, key) => {
            obj[key] = enunordered[key];
            return obj;
        }, {}
    );
    let tr = Object.keys(trunordered).sort().reduce(
        (obj, key) => {
            obj[key] = trunordered[key];
            return obj;
        }, {}
    );
    res.render('locales', {
        title: 'Locales',
        en: en || {},
        tr: tr || {},
        diff: req.query.diff || false
    });
});
app.post('/locales', (req, res) => {
    try {
        let secretKey = req.body.secretKey;
        if (process.env.SECRET_KEY == secretKey) {
            let enjson = req.body.en;
            let trjson = req.body.tr;
            if (enjson)
                fs.writeFileSync('./locales/en.json', JSON.stringify(enjson, null, 4), 'utf8');
            if (trjson)
                fs.writeFileSync('./locales/tr.json', JSON.stringify(trjson, null, 4), 'utf8');
            res.json({
                status: 200
            });
        } else {
            res.json({
                status: 401
            });
        }
    } catch (e) {
        console.error(e);
        res.json({
            status: 500,
            error: e.message
        });
    }
});

app.get('/login', loginController.getLogin);
app.post('/login', loginController.postLogin);
app.get('/logout', passportConfig.isAuthenticated, loginController.logout);
app.get('/profile', passportConfig.isAuthenticated, usersController.getUserProfile);
app.post('/profile', passportConfig.isAuthenticated, aws.single('file'), usersController.postUserProfile);

app.get('/operations', passportConfig.isAuthenticated, operationsController.getOperations);
app.get('/operation/:uuid', passportConfig.isAuthenticated, operationsController.getOperation);

app.get('/users', passportConfig.isAuthenticated, usersController.getUsers);
app.post('/users', passportConfig.isAuthenticated, usersController.postUsers);
app.get('/user/:uuid', passportConfig.isAuthenticated, usersController.getUser);
app.post('/user/:uuid', passportConfig.isAuthenticated, usersController.postUser);

app.get('/roles', passportConfig.isAuthenticated, rolesController.getRoles);
app.post('/roles', passportConfig.isAuthenticated, rolesController.postRoles);
app.get('/role/:uuid', passportConfig.isAuthenticated, rolesController.getRole);
app.post('/role/:uuid', passportConfig.isAuthenticated, rolesController.postRole);

app.get('/dropdowns', passportConfig.isAuthenticated, dropdownsController.getDropdowns);
app.post('/dropdowns', passportConfig.isAuthenticated, dropdownsController.postDropdowns);
app.get('/dropdown/:uuid', passportConfig.isAuthenticated, dropdownsController.getDropdown);
app.post('/dropdown/:uuid', passportConfig.isAuthenticated, dropdownsController.postDropdown);

app.get('/parameters', passportConfig.isAuthenticated, parametersController.getParameters);
app.post('/parameters', passportConfig.isAuthenticated, parametersController.postParameters);
app.get('/parameter/:uuid', passportConfig.isAuthenticated, parametersController.getParameter);
app.post('/parameter/:uuid', passportConfig.isAuthenticated, parametersController.postParameter);

app.get('/messages', passportConfig.isAuthenticated, messagesController.getMessages);
app.post('/messages', passportConfig.isAuthenticated, messagesController.postMessages);
app.get('/message/:uuid', passportConfig.isAuthenticated, messagesController.getMessage);
app.post('/message/:uuid', passportConfig.isAuthenticated, messagesController.postMessage);

app.get('/rules', passportConfig.isAuthenticated, getLimitedSubsidiaryList, getLimitedOperationList, rulesController.getRules);
app.post('/rules', passportConfig.isAuthenticated, rulesController.postRules);
app.get('/rule/:uuid', passportConfig.isAuthenticated, rulesController.getRule);
app.post('/rule/:uuid', passportConfig.isAuthenticated, rulesController.postRule);

app.get('/rule-errors', passportConfig.isAuthenticated, getLimitedOperationList, getLimitedUserList, ruleErrorsController.getRuleErrors);
app.get('/rule-error/:uuid', passportConfig.isAuthenticated, ruleErrorsController.getRuleError);

app.get('/reconciliation-checks', passportConfig.isAuthenticated, getLimitedSubsidiaryList, getLimitedOperationList, reconciliationChecksController.getReconciliationChecks);
app.post('/reconciliation-checks', passportConfig.isAuthenticated, reconciliationChecksController.postReconciliationChecks);
app.get('/reconciliation-check/:uuid', passportConfig.isAuthenticated, reconciliationChecksController.getReconciliationCheck);
app.post('/reconciliation-check/:uuid', passportConfig.isAuthenticated, reconciliationChecksController.postReconciliationCheck);

app.get('/reconciliation-check-errors', passportConfig.isAuthenticated, reconciliationCheckErrorsController.getReconciliationCheckErrors);
app.get('/reconciliation-check-error/:uuid', passportConfig.isAuthenticated, reconciliationCheckErrorsController.getReconciliationCheckError);

app.get('/requests', passportConfig.isAuthenticated, getDropdownList, requestsController.getRequests);
app.post('/requests', passportConfig.isAuthenticated, requestsController.postRequests);

app.get('/request-approvals/:uuid', passportConfig.isAuthenticated, requestsApprovalController.getRequestApproval);
app.get('/request-approvals', passportConfig.isAuthenticated, getLimitedSubsidiaryList, requestsApprovalController.getRequestApprovals);
app.post('/request-approvals', passportConfig.isAuthenticated, requestsApprovalController.postRequestApprovals);

app.get('/subsidiary-tables', passportConfig.isAuthenticated, getLimitedSubsidiaryList, subsidiaryTablesController.getSubsidiaryTables);
app.post('/subsidiary-tables', passportConfig.isAuthenticated, subsidiaryTablesController.postSubsidiaryTables);
app.get('/subsidiary-table/:uuid', passportConfig.isAuthenticated, subsidiaryTablesController.getSubsidiaryTable);
app.post('/subsidiary-table/:uuid', passportConfig.isAuthenticated, subsidiaryTablesController.postSubsidiaryTable);

app.get('/table-column-models', passportConfig.isAuthenticated, tableColumnModelsController.getTableColumnModels);
app.get('/table-column-model/:uuid', passportConfig.isAuthenticated, getDropdownList, tableColumnModelsController.getTableColumnModel);
app.post('/table-column-model/:uuid', passportConfig.isAuthenticated, tableColumnModelsController.postTableColumnModel);

app.get('/super-admin', passportConfig.isAuthenticated, getLimitedSubsidiaryList, superAdmin.getSelectFields);
app.post('/super-admin', passportConfig.isAuthenticated, superAdmin.post);

app.get('/trend-analyzes', passportConfig.isAuthenticated, trendAnalysisController.getTrendAnalyzes);
app.post('/trend-analyzes', passportConfig.isAuthenticated, trendAnalysisController.postTrendAnalyzes);
app.get('/trend-analysis/:uuid', passportConfig.isAuthenticated, trendAnalysisController.getTrendAnalysis);
app.post('/trend-analysis/:uuid', passportConfig.isAuthenticated, trendAnalysisController.postTrendAnalysis);
app.post('/script/:uuid', passportConfig.isAuthenticated, trendAnalysisController.scriptTrendAnalysis);

app.post('/statistic/:type', passportConfig.isAuthenticated, statisticController.getStatisticByType);
app.post('/statistic/report/detail', passportConfig.isAuthenticated, statisticController.getReportDetail);
app.get('/:table/statistics/:year', passportConfig.isAuthenticated, statisticController.getTableStatistics);

app.get('/data-models', passportConfig.isAuthenticated, systemController.getTables);
app.get('/data-model/:uuid', passportConfig.isAuthenticated, systemController.getTable);

app.get('/app-logs', passportConfig.isAuthenticated, applicationLogsController.getApplicationLogs);
app.get('/app-logs/:uuid', passportConfig.isAuthenticated, applicationLogsController.getApplicationLog);

app.get('/api-logs', passportConfig.isAuthenticated, getLimitedUserList, apiLogsController.getApiLogs);
app.get('/api-logs/:uuid', passportConfig.isAuthenticated, apiLogsController.getApiLog);

app.get('/error-logs', passportConfig.isAuthenticated, getLimitedUserList, apiLogsController.getErrorLogs);
app.get('/error-logs/:uuid', passportConfig.isAuthenticated, apiLogsController.getErrorLog);

app.get('/notifications', passportConfig.isAuthenticated, getLimitedRoleList, getLimitedOperationList, notificationController.getNotifications);
app.post('/notifications', passportConfig.isAuthenticated, notificationController.postNotifications);
app.get('/notification/:uuid', passportConfig.isAuthenticated, notificationController.getNotification);
app.post('/notification/:uuid', passportConfig.isAuthenticated, notificationController.postNotification);

app.get('/userAnnouncements', passportConfig.isAuthenticated, announcementController.getUserAnnouncements);
app.get('/userAnnouncement/:uuid', passportConfig.isAuthenticated, announcementController.getUserAnnouncement);
app.post('/userAnnouncement/:uuid', passportConfig.isAuthenticated, announcementController.postAnnouncement);

app.get('/announcements', passportConfig.isAuthenticated, announcementController.getAnnouncements);
app.post('/announcements', passportConfig.isAuthenticated, announcementController.postAnnouncements);
app.get('/announcement-details/:uuid', passportConfig.isAuthenticated, announcementController.getAnnouncementDetail);
app.get('/announcement/:uuid', passportConfig.isAuthenticated, announcementController.getAnnouncement);
app.post('/announcement/:uuid', passportConfig.isAuthenticated, announcementController.postAnnouncement);
app.get('/announcements/unread-popup-announcement', passportConfig.isAuthenticated, announcementController.getUnreadPopup);
app.get('/unreadAnnouncement', passportConfig.isAuthenticated, announcementController.unreadAnouncement);

app.get('/organization', passportConfig.isAuthenticated, organizationController.getOrganization);
app.post('/organization', passportConfig.isAuthenticated, aws.single('file'), organizationController.postOrganization);

app.get('/companies', passportConfig.isAuthenticated, companyController.getSubsidiaries);
app.post('/companies', passportConfig.isAuthenticated, companyController.postSubsidiaries);
app.get('/company/:uuid', passportConfig.isAuthenticated, companyController.getSubsidiary);
app.post('/company/:uuid', passportConfig.isAuthenticated, aws.single('file'), companyController.postSubsidiary);

app.get('/documents', passportConfig.isAuthenticated, documentController.getDocuments);
app.post('/documents', passportConfig.isAuthenticated, documentController.postDocuments);
app.get('/document/:uuid', passportConfig.isAuthenticated, documentController.getDocument);
app.post('/document/:uuid', passportConfig.isAuthenticated, aws.single('file'), documentController.postDocument);
app.get('/documentFiles/:screenCode', passportConfig.isAuthenticated, documentController.getDocumentFiles);
app.get('/document/download/:fileName/:code', passportConfig.isAuthenticated, documentController.downloadDocument);

app.get('/deadlines', passportConfig.isAuthenticated, getLimitedSubsidiaryList, deadlineController.getDeadlines);
app.post('/deadlines', passportConfig.isAuthenticated, upload.single('file'), deadlineController.postDeadlines);
app.get('/deadline/:uuid', passportConfig.isAuthenticated, deadlineController.getDeadline);
app.post('/deadline/:uuid', passportConfig.isAuthenticated, deadlineController.postDeadline);

app.get('/upload', passportConfig.isAuthenticated, financialManagementController.getFinancialManagement);
app.post('/upload', passportConfig.isAuthenticated, upload.single('file'), financialManagementController.postFinancialManagement);
app.post('/rpa-dashboard', passportConfig.isAuthenticated, upload.single('file'), rpaDashboardController.postRpaDashboard);
app.get('/graph-settings',passportConfig.isAuthenticated , graphSettingController.getGraphSettingsPage)

app.get('/acct-placed-collaterals', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/acct-placed-collaterals', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/acct-placed-collateral/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/acct-placed-collateral/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/asset-accs', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/asset-accs', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/asset-acc/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/asset-acc/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/asset-items', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/asset-items', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/asset-item/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/asset-item/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/ciu-fund-components', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/ciu-fund-components', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/ciu-fund-component/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/ciu-fund-component/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/ciu-fund-infos', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/ciu-fund-infos', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/ciu-fund-info/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/ciu-fund-info/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/collaterals', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/collaterals', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/collateral/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/collateral/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/currency-tables', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/currency-tables', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/currency-table/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/currency-table/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/customers', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/customers', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/customer/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/customer/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/degrees', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/degrees', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/degree/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/degree/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/fx-futures', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/fx-futures', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/fx-future/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/fx-future/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/intragroup-transactions', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/intragroup-transactions', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/intragroup-transaction/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/intragroup-transaction/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/liability-accs', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/liability-accs', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/liability-acc/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/liability-acc/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/netting-agreements', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/netting-agreements', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/netting-agreement/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/netting-agreement/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/net-exposures', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/net-exposures', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/net-exposure/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/net-exposure/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/liability-items', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/liability-items', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/liability-item/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/liability-item/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/off-balance-sheets', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/off-balance-sheets', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/off-balance-sheet/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/off-balance-sheet/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/off-balance-sheet-accs', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/off-balance-sheet-accs', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/off-balance-sheet-acc/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/off-balance-sheet-acc/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/options', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/options', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/option/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/option/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/payment-schedules', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/payment-schedules', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/payment-schedule/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/payment-schedule/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/repos', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/repos', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/repo/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/repo/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/securities', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/securities', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/security/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/security/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/swaps', passportConfig.isAuthenticated, getDropdownList, configurator.getList);
app.post('/swaps', passportConfig.isAuthenticated, upload.single('file'), configurator.postList);
app.get('/swap/:uuid', passportConfig.isAuthenticated, getDropdownList, configurator.get);
app.post('/swap/:uuid', passportConfig.isAuthenticated, configurator.post);

app.get('/settings', passportConfig.isAuthenticated, settingsController.getSettings);

app.get('/rpa-dashboard', passportConfig.isAuthenticated, rpaDashboardController.getRpaDashboard);

app.get('/ai-agent/models', passportConfig.isAuthenticated, async function (req, res) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

    try {
        const response = await axios.get(`${ollamaBaseUrl}/api/tags`, {
            timeout: 10000
        });

        const models = (response.data && Array.isArray(response.data.models) ? response.data.models : [])
            .map(function (model) {
                return model && model.name ? model.name : null;
            })
            .filter(Boolean);

        res.json({
            statusCode: 200,
            models: models
        });
    } catch (error) {
        console.error('[ai-agent/models] ollama error:', error && error.message ? error.message : error);
        res.status(502).json({
            statusCode: 502,
            error: 'Ollama model list could not be fetched. Make sure Ollama is running.'
        });
    }
});

app.post('/ai-agent/chat', passportConfig.isAuthenticated, async function (req, res) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const body = req.body || {};
    const model = body.model;
    const question = body.question;
    const context = body.context || {};

    if (!model || !question || !`${question}`.trim()) {
        return res.status(400).json({
            statusCode: 400,
            error: 'Model and question are required.'
        });
    }

    // Keep payload bounded for stability with larger dashboards.
    const contextString = JSON.stringify(context);
    const trimmedContext = contextString && contextString.length > 120000
        ? `${contextString.substring(0, 120000)}...`
        : contextString;

    const systemPrompt = [
        'You are an analytics copilot for an RPA dashboard.',
        'Answer using only the provided dashboard data context and user question.',
        'If the answer is not present in context, state that clearly and suggest what data/filter is needed.',
        'Keep answers concise and business-readable.',
        'When possible include computed values and trends from the context.'
    ].join(' ');

    try {
        const response = await axios.post(`${ollamaBaseUrl}/api/chat`, {
            model: model,
            stream: false,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Dashboard context JSON:\n${trimmedContext}` },
                { role: 'user', content: `${question}` }
            ],
            options: {
                temperature: 0.2
            }
        }, {
            timeout: 60000
        });

        const answer = response && response.data && response.data.message && response.data.message.content
            ? response.data.message.content
            : '';

        res.json({
            statusCode: 200,
            answer: answer
        });
    } catch (error) {
        console.error('[ai-agent/chat] ollama error:', error && error.message ? error.message : error);
        res.status(502).json({
            statusCode: 502,
            error: 'AI agent request failed. Check Ollama availability and selected model.'
        });
    }
});

app.post('/ai-agent/chat-stream', passportConfig.isAuthenticated, async function (req, res) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const body = req.body || {};
    const model = body.model;
    const question = body.question;
    const context = body.context || {};

    if (!model || !question || !`${question}`.trim()) {
        return res.status(400).json({
            statusCode: 400,
            error: 'Model and question are required.'
        });
    }

    const contextString = JSON.stringify(context);
    const trimmedContext = contextString && contextString.length > 120000
        ? `${contextString.substring(0, 120000)}...`
        : contextString;

    const systemPrompt = [
        'You are an analytics copilot for an RPA dashboard.',
        'Answer using only the provided dashboard data context and user question.',
        'If the answer is not present in context, state that clearly and suggest what data/filter is needed.',
        'Keep answers concise and business-readable.',
        'When possible include computed values and trends from the context.'
    ].join(' ');

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let closed = false;
    req.on('close', function () {
        closed = true;
    });

    try {
        const response = await axios.post(`${ollamaBaseUrl}/api/chat`, {
            model: model,
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Dashboard context JSON:\n${trimmedContext}` },
                { role: 'user', content: `${question}` }
            ],
            options: {
                temperature: 0.2
            }
        }, {
            responseType: 'stream',
            timeout: 0
        });

        let pending = '';
        response.data.on('data', function (chunk) {
            if (closed) return;
            pending += chunk.toString('utf8');
            const lines = pending.split('\n');
            pending = lines.pop() || '';

            lines.forEach(function (line) {
                const trimmed = (line || '').trim();
                if (!trimmed) return;

                try {
                    const parsed = JSON.parse(trimmed);
                    const content = parsed && parsed.message && parsed.message.content
                        ? parsed.message.content
                        : '';

                    if (content) {
                        res.write(`${JSON.stringify({ token: content })}\n`);
                    }

                    if (parsed && parsed.done) {
                        res.write(`${JSON.stringify({ done: true })}\n`);
                    }
                } catch (streamParseError) {
                    res.write(`${JSON.stringify({
                        error: 'A stream chunk could not be parsed.'
                    })}\n`);
                }
            });
        });

        response.data.on('end', function () {
            if (closed) return;
            if ((pending || '').trim()) {
                try {
                    const parsed = JSON.parse(pending.trim());
                    const content = parsed && parsed.message && parsed.message.content
                        ? parsed.message.content
                        : '';
                    if (content) {
                        res.write(`${JSON.stringify({ token: content })}\n`);
                    }
                } catch (ignoredEndParseError) {
                    // Ignore trailing non-JSON fragment.
                }
            }
            res.write(`${JSON.stringify({ done: true })}\n`);
            res.end();
        });

        response.data.on('error', function () {
            if (closed) return;
            res.write(`${JSON.stringify({
                error: 'AI stream interrupted while reading response.'
            })}\n`);
            res.end();
        });
    } catch (error) {
        if (closed) return;
        res.write(`${JSON.stringify({
            error: 'AI stream request failed. Check Ollama availability and selected model.'
        })}\n`);
        res.end();
    }
});

app.get('/data-list', passportConfig.isAuthenticated, robotListController.getRobotList);
app.get('/companies-list', passportConfig.isAuthenticated, companiesListController.getCompaniesList);

app.get('/jobs', passportConfig.isAuthenticated, jobsController.getJobs);
app.get('/queue', passportConfig.isAuthenticated, queueController.getQueue);
app.get('/robots', passportConfig.isAuthenticated,robotsController.getRobotsList)

app.post('/rpadStateChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterStateChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_STATE_FILTER}`, 'POST', {
        startTime : filterStateChart.startTime,
        endTime : filterStateChart.endTime
        
    }, req, res);
    res.json(table)
});

app.post('/workingHoursOccupancyChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterworkingHoursOccupancyChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_WORKING_HOURS_RATE_FILTER}`, 'POST', {
        workDate : filterworkingHoursOccupancyChart.workDate,
        robots : filterworkingHoursOccupancyChart.robots,
    }, req, res);
    res.json(table)
});

app.post('/totalJobTimeChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filtertotalJobTimeChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_TOTAL_TIME_WEEKLY_FILTER}`, 'POST', {
        year: filtertotalJobTimeChart.year,
        month: filtertotalJobTimeChart.month,
    }, req, res);
    res.json(table)
});

app.post('/overallChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filteroverallChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_DAILY_WORKED_TIME_FILTER}`, 'POST', {
        workDate : filteroverallChart.workDate2,
        robots : filteroverallChart.robots,
    }, req, res);
    res.json(table)
});

app.post('/robotsOccupancyRateChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterRobotsOccupancyRateChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_ROBOTS_OCCUPANCY_RATE_CHART}`, 'POST', {
        startTime : filterRobotsOccupancyRateChart.startTime,
        endTime : filterRobotsOccupancyRateChart.endTime
    }, req, res);
    res.json(table)
});

app.post('/queueTransactionTimeChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterQueueTransactionTimeChart = req.body;
    let table = await API.requestAsync(`${process.env.API_QUEUE_TRANSACTION_TIME_CHART}`, 'POST', {
        startTime: filterQueueTransactionTimeChart.startTime,
        endTime: filterQueueTransactionTimeChart.endTime,
        queues : filterQueueTransactionTimeChart.queues,
        robots : filterQueueTransactionTimeChart.robots,
    }, req, res);
    res.json(table)
});

app.post('/queueStatusTimeChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterQueueStatusTimeChart = req.body;
    let table = await API.requestAsync(`${process.env.API_QUEUE_STATUS_CHART}`, 'POST', {
        startTime: filterQueueStatusTimeChart.startTime,
        endTime: filterQueueStatusTimeChart.endTime,
        queues : filterQueueStatusTimeChart.queues,
    }, req, res);
    res.json(table)
});

app.post('/releaseTotalTimeChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterReleaseTotalTimeChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RELEASE_TOTAL_TIME_CHART}`, 'POST', {
        year: filterReleaseTotalTimeChart.year,
        month: filterReleaseTotalTimeChart.month,
        robots : filterReleaseTotalTimeChart.robots,

    }, req, res);
    res.json(table)
});

app.post('/dailyDensityChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterDailyDensityChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_INTENSITY_DAILY_DENSITY}`, 'POST', {
        startTime : filterDailyDensityChart.startTime,
        endTime : filterDailyDensityChart.endTime,
        robots : filterDailyDensityChart.robots,
    }, req, res);
    res.json(table)
});

app.post('/rpadStateChart2-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterRpadStateChart2 = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_ROBOTS_LIST}`, 'POST', {
        robots : filterRpadStateChart2.robots,
        startTime : filterRpadStateChart2.startTime,
        endTime : filterRpadStateChart2.endTime 
    }, req, res);
    res.json(table)
});

app.post('/robotsOccupancyRateChart2-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterRobotsOccupancyRateChart2 = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_ROBOTS_LIST2}`, 'POST', {
        robots : filterRobotsOccupancyRateChart2.robots,
        startTime : filterRobotsOccupancyRateChart2.startTime,
        endTime : filterRobotsOccupancyRateChart2.endTime 
    }, req, res);
    res.json(table)
});

app.post('/rpadDataChart-filter', passportConfig.isAuthenticated, async function (req, res) {
    const filterRpadDataChart = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_DATA}`, 'POST', {
        companyId : filterRpadDataChart.companyId,
    }, req, res);
    res.json(table)
});

app.post("/rpad-history" , passportConfig.isAuthenticated , async function (req,res) {
    const savedChartFilters = req.body;
    console.log("asafsdfasdfasdgasdgsdfga")
    let table = await API.requestAsync(`${process.env.API_RPAD_HISTORY_SAVE}` , 'POST' , {
        historyList : savedChartFilters.historyList
    } , req,res)
    res.json(table)
})


app.post("/rpad-charts-status-save" , passportConfig.isAuthenticated , async function (req,res) {
    const savedChartsArragement = req.body;
    let table = await API.requestAsync(`${process.env.API_RPAD_CHARTS_STATUS_SAVE}` , 'POST' , {
        chartsStatusList : savedChartsArragement.chartsStatusList
    } , req,res)
    res.json(table)
})

app.get("/rpad-charts-status" , passportConfig.isAuthenticated, async function(req,res) {
    let userId = req.user.uuid
    const response = res.chartsStatusList
    let table = await API.requestAsync(`${process.env.API_RPAD_CHARTS_STATUS_LIST}/${userId}` , 'GET' ,  {response} , req,res)
    res.json(table)
})


/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
    // only use in development
    app.use(errorHandler());
} else {
    app.use((err, req, res, next) => {
        console.error("ERROR: ", err);
        return res.redirect('/500');
    });
}

/**
 * Start Express server.
 */
const server = app.listen(app.get('port'), () => {
    console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), environment);
    console.log('  Press CTRL-C to stop\n');
});
server.setTimeout(Number(app.get('timeout')));

module.exports = app;
