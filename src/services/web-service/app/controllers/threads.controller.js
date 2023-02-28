const appPath = process.env.WEB_SERVICE_APP_PATH;
const mediaPath = process.env.WEB_SERVICE_MEDIA_PATH;

const threadsView = (req, res) => {
    res.render(`${appPath}/views/threads`);
};

const threadsDeleteApi = (req, res) => {
    res.json({
        response: 'TO-DO',
    });
};

module.exports = {
    threadsView,
    threadsDeleteApi,
};