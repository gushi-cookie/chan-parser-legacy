const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');
const FileStasherService = require('./services/file-stasher-service/FileStasherService');
const WebService = require('./services/web-service/WebService');
const DatabaseService = require('./services/database-service/DatabaseService');

module.exports = class ChanParser {
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
        this.threadsObserverService.on('post-delete', (pde) => {
            console.log('############## POST DELETED');
            console.log(pde.post.number);
            console.log(pde.post.comment);
        });

        setInterval(() => {
            console.log('S ' + this.threadsObserverService.threads.length);
        }, 3000);
    };

    async start() {
        await this.databaseService.startDatabase();
        this.threadsObserverService.startCatalogObserver();
        this.fileStasherService.startStasher('suspicious');
    };

    async stop() {
        this.fileStasherService.stopStasher();
        this.threadsObserverService.stopCatalogObserver();
        await this.databaseService.stopDatabase();
    };
};