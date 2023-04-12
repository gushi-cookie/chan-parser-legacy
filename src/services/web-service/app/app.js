const express = require('express');
const serveIndex = require('serve-index');

/**
 * Class that works with express.js's app.
 */
class App {

    /**
     * Create an instance of the App class.
     * @param {number} port Http's server port.
     */
    constructor(port) {
        this.appPath = process.env.WEB_SERVICE_APP_PATH;
        this.mediaPath = process.env.WEB_SERVICE_MEDIA_PATH;
        this.port = port;

        this.app = express();
        this.server = null;
        /**@type {import('winston').Logger} */ this.logger = null;
    };

    
    /**
     * Initialize express app and run it.
     */
    async startServer() {
        this.logger = process.webLogger;

        let app = this.app;
        app.set('view engine', 'ejs');
        app.use('/public', express.static(`${this.appPath}/public`), serveIndex(`${this.appPath}/public`, {icons: true}));
        app.use(require('./routes/cdn'));
        app.use(require('./routes/home'));
        app.use(require('./routes/thread'));
        app.use(require('./routes/catalog-threads'));

        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, (error) => {
                if(error) throw error;
                this.logger.info(`App started on port ${this.port}.`);
                resolve();
            });
        });
    };

    /**
     * Stop the express app.
     */
    async stopServer() {
        return new Promise((resolve) => {
            this.server.close((error) => {
                if(error) throw error;
                this.logger.info(`App has stopped.`);
                resolve();
            });
        });
    };
};

module.exports = App;