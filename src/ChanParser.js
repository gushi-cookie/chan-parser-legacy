const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');
const FileStasherService = require('./services/file-stasher-service/FileStasherService');
const WebService = require('./services/web-service/WebService');
const DatabaseService = require('./services/database-service/DatabaseService');
const LogService = require('./services/LogService');


/**
 * Class represents an entry point for the whole project.
 */
class ChanParser {
    
    /**
     * Create an instance of the ChanParser class.
     */
    constructor() {
        require('dotenv').config();

        process.database = null;

        this.logService = new LogService('info');
        this.databaseService = new DatabaseService();
        this.threadsObserverService = new ThreadsObserverService();
        this.fileStasherService = new FileStasherService(this.threadsObserverService, '/home/node/output', 600000);
        this.webService = new WebService();


        this.threadsObserverService.on('thread-create', (tce) => {
            console.log('New thread! Num: ' + tce.thread.number);
        });
        this.threadsObserverService.on('post-create', (pce) => {
            console.log('New post! Num: ' + pce.post.number);
        });
        this.threadsObserverService.on('file-create', (fce) => {
            console.log('New file! Name: ' + fce.file.uploadName);
        });

        setInterval(() => {
            console.log(`S ${this.threadsObserverService.threads.length} | SF ${this.fileStasherService.files.length}`);
        }, 3000);
    };


    /**
     * Start the program.
     */
    async start() {
        process.database = this.databaseService;

        await this.databaseService.startDatabase();
        this.fileStasherService.startStasher('web');
        await this.threadsObserverService.startCatalogObserver();
        await this.webService.startService();
    };

    /**
     * Stop the program.
     */
    async stop() {
        await this.webService.stopService();
        await this.threadsObserverService.stopCatalogObserver();
        this.fileStasherService.stopStasher();
        await this.databaseService.stopDatabase();

        process.database = null;
    };
};

module.exports = ChanParser;