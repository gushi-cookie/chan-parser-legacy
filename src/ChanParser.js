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

        this.logService = new LogService('verbose');

        this.logger        = this.logService.logger.child({ servicePrefix: '   Entry' });
        let databaseLogger = this.logService.logger.child({ servicePrefix: 'Database' });
        let observerLogger = this.logService.logger.child({ servicePrefix: 'Observer' });
        let stasherLogger  = this.logService.logger.child({ servicePrefix: ' Stasher' });
        let webLogger      = this.logService.logger.child({ servicePrefix: '     Web' });

        this.databaseService = new DatabaseService(databaseLogger);
        this.threadsObserverService = new ThreadsObserverService(observerLogger);
        this.fileStasherService = new FileStasherService(this.threadsObserverService, '/home/node/output', 600000, stasherLogger);
        this.webService = new WebService(8080, webLogger);


        this.threadsObserverService.on('thread-create', (tce) => {
            this.logger.verbose('New thread! Num: ' + tce.thread.number);
        });
        this.threadsObserverService.on('post-create', (pce) => {
            this.logger.verbose('New post! Num: ' + pce.post.number);
        });
        this.threadsObserverService.on('file-create', (fce) => {
            this.logger.verbose('New file! Name: ' + fce.file.uploadName);
        });

        setInterval(() => {
            this.logger.verbose(`>>>> BriefStat <<<< S ${this.threadsObserverService.threads.length} | SF ${this.fileStasherService.files.length}`);
        }, 5000);
    };


    /**
     * Start the program.
     */
    async start() {
        this.logger.info('Starting the program.');
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
        this.logger.info('Stopping the program.');
        await this.webService.stopService();
        await this.threadsObserverService.stopCatalogObserver();
        this.fileStasherService.stopStasher();
        await this.databaseService.stopDatabase();
        
        process.database = null;
    };
};

module.exports = ChanParser;