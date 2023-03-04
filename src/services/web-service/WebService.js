const App = require('./app/app');

/**
 * Class represents a service which works with a web application of the project.
 */
class WebService {

    /**
     * Create an instance of the WebService class.
     * @param {number} port Http's server port.
     */
    constructor(port) {
        this.app = new App(8080);
    };


    /**
     * Start the service.
     */
    async startService() {
        await this.app.startServer();
    };

    /**
     * Stop the service.
     */
    async stopService() {
        await this.app.stopServer();
    };
};


module.exports = WebService;