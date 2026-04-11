const {markdown} = require("markdown");
const API = require("../rest/api");
const endpoints = [
    {
        model: 'Jobs',
        table: 'RPAD_JOBS'
    },
    {
        model: 'Queues',
        table: 'RPAD_QUEUE'
    },
    {
        model: 'Daily Intensity',
        table: 'RPAD_DAILY_INTENSITY'
    },
];
exports.getGraphSettingsPage = async (req,res) => {
    try {
        const render = {
            title: "Graph Page",
            page: "graphSettings"
        };
        let userId = req.user.uuid;
        let arrangement = await API.requestAsync( `${process.env.API_RPAD_CHARTS_STATUS_LIST}/${userId}` , 'GET' , {} , req,res)
        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        render.models = endpoints.map(x => x.model);
        const graphRender = {
            userId : userId,
            arrangement : arrangement
        }
        let newObject = Object.assign({}, render , graphRender)
        res.render("pages/graphSettings", newObject)
    } catch (error) {
        res.json({
            message : "hata alındı", error
        })
    }
}