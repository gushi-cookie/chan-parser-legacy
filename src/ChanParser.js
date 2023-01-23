const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');
const FileStasherService = require('./services/file-stasher-service/FileStasherService');

module.exports = class ChanParser {
    constructor() {
        this.threadsObserverService = new ThreadsObserverService();
        this.fileStasherService = new FileStasherService(this.threadsObserverService, true, '/home/node/output', false);

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
            console.log(this.threadsObserverService.circulatingQueue.length + ' Q/S ' + this.threadsObserverService.threads.length);
        }, 3000);
    };

    start() {
        this.threadsObserverService.startCatalogObserver();
        this.threadsObserverService.startThreadUpdater();
        this.fileStasherService.startStasher();
    };

    stop() {
        this.fileStasherService.stopStasher();
        this.threadsObserverService.stopThreadUpdater();
        this.threadsObserverService.stopCatalogObserver();
    };
};