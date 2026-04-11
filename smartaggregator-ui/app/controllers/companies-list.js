const markdown = require("markdown").markdown;
const path = require('path');
const API = require('../rest/api');
const s3 = require('../config/s3config');

function validator(file) {
    if (`${process.env.ACCEPTABLE_LOGO_TYPE}` !== path.extname(file.originalname)) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_LOGO_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

const imgs = {};

async function setImgs(arr) {
    if (!Array.isArray(arr)) return [];

    for (let i = 0; i < arr.length; i++) {
        if (arr[i].logo) {
            if (!imgs.hasOwnProperty(arr[i].uuid) || imgs[arr[i].uuid].icon !== arr[i].logo) {
                imgs[arr[i].uuid] = {icon: arr[i].logo, img: await s3.getImage(arr[i].logo + '.png')}
            }

            arr[i].img = imgs[arr[i].uuid].img;
        }
    }

    return arr;
}

exports.getCompaniesList = async (req, res) => {
    req.session._subsidiary_ = null;

    const render = {
        title: 'Companies List',
        page: "companies-list",
        objects: [
            {
                key: "subsidiaries",
                name: "subsidiaries",
                uri: `${process.env.API_SUBSIDIARY}`,
                method: 'GET',
                data: req.query.q
            }
        ]
    };

    let responses = await API.responser(req, res, render.objects);
    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;
        
        render.subsidiaries.content.sort(function(a, b) {
            var textA = a.formalName.toUpperCase();
            var textB = b.formalName.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        

        render.subsidiaries.content = await setImgs(render.subsidiaries.content);

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};