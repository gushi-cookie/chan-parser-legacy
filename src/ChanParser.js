const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');

module.exports = class ChanParser {
    constructor() {
        this.threadsObserverService = new ThreadsObserverService();

        this.threadsObserverService.on('thread-create', (tce) => {
            console.log('New thread! Num: ' + tce.thread.number);
        });
        this.threadsObserverService.on('thread-diff', (tde) => {
            console.log('Threads diff! Num: ' + tde.thread.number);
            let td = tde.threadsDiff;
            let td2 = {
                thread1: null,
                thread2: null,
                fields: td.fields,
                postsDiff: td.postsDiff
            }
            console.log(td2);
        });
        this.threadsObserverService.on('post-create', (pce) => {
            console.log('New Post! Thread ' + pce.thread.number + ' Post ' + pce.post.number);
        });

        setInterval(() => {
            console.log(this.threadsObserverService.circulatingQueue.length + '/' + this.threadsObserverService.threads.length);
        }, 2500);
    };

    start() {
        this.threadsObserverService.startCatalogObserver();
        this.threadsObserverService.startThreadUpdater();
    };

    stop() {
        this.threadsObserverService.stopThreadUpdater();
        this.threadsObserverService.stopCatalogObserver();
    };
};