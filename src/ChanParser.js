const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');
const FileStasherService = require('./services/file-stasher-service/FileStasherService');
const WebService = require('./services/web-service/WebService');
const DatabaseService = require('./services/database-service/DatabaseService');


/**
 * Class represents an entry point for the whole project.
 */
class ChanParser {
    
    /**
     * Create an instance of the ChanParser class.
     */
    constructor() {
        require('dotenv').config();

        this.databaseService = new DatabaseService();
        this.threadsObserverService = new ThreadsObserverService();
        this.fileStasherService = new FileStasherService(this.threadsObserverService, true, '/home/node/output', false, 600000);
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
            console.log('S ' + this.threadsObserverService.threads.length);
        }, 3000);
    };


    /**
     * Start the program.
     */
    async start() {
        process.database = this.databaseService;

        await this.databaseService.startDatabase();
        this.threadsObserverService.startCatalogObserver();
        this.fileStasherService.startStasher('suspicious');
        await this.webService.startService();
    };

    /**
     * Stop the program.
     */
    async stop() {
        await this.webService.stopService();
        this.fileStasherService.stopStasher();
        this.threadsObserverService.stopCatalogObserver();
        await this.databaseService.stopDatabase();

        process.database = undefined;
    };
};

module.exports = ChanParser;