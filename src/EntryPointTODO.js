const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');

module.exports = class EntryPointTODO {
    constructor() {
        this.threadsObserverService = new ThreadsObserverService();
    };

    start() {
        this.threadsObserverService.startObserve();
        this.threadsObserverService.startThreadsUpdater();
    };

    stop() {
        this.threadsObserverService.stopObserve();
        this.threadsObserverService.stopThreadsUpdater();
    };
};