const appPath = process.env.WEB_SERVICE_APP_PATH;
const mediaPath = process.env.WEB_SERVICE_MEDIA_PATH;

const homeView = (req, res) => {
    res.render(`${appPath}/views/home`);
};


module.exports = {
    homeView,
};