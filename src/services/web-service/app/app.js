const express = require('express');
const serveIndex = require('serve-index');

class App {
    constructor(port) {
        this.appPath = process.env.WEB_SERVICE_APP_PATH;
        this.mediaPath = process.env.WEB_SERVICE_MEDIA_PATH;
        this.port = port;

        let app = express();
        this.app = app;
        this.server = null;

        app.set('view engine', 'ejs');
        app.use('/public', express.static(`${this.appPath}/public`), serveIndex(`${this.appPath}/public`, {icons: true}));
        app.use('/cdn', express.static(this.mediaPath), serveIndex(this.mediaPath, {icons: true}));
        app.use(require('./routes/home'));
        app.use(require('./routes/threads'));
        app.use(require('./routes/catalog-threads'));
    };

    startServer() {
        this.server = this.app.listen(this.port, () => {
            console.log(`App started on port ${this.port}.`);
        });
    };

    stopStop() {
        this.server.close();
    };
};

module.exports = App;