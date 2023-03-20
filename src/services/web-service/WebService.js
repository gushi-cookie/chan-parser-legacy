const App = require('./app/app');

/**
 * Class represents a service which works with a web application of the project.
 */
class WebService {

    /**
     * Create an instance of the WebService class.
     * @param {number} port Http's server port.
     * @param {import('winston').Logger} logger Winston's logger.
     */
    constructor(port, logger) {
        this.port = port;
        this.logger = logger;
        this.app = new App(port);
    };


    /**
     * Start the service.
     */
    async startService() {
        this.logger.info('Starting service.');
        
        this.logger.info('Populating a web logger to the process object.');
        process.webLogger = this.logger;

        await this.app.startServer();
    };

    /**
     * Stop the service.
     */
    async stopService() {
        this.logger.info('Stopping service.');
        await this.app.stopServer();
    };
};


module.exports = WebService;