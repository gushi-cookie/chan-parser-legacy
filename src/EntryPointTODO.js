const ThreadsObserverService = require('./services/threads-observer-service/ThreadsObserverService');

module.exports = class EntryPointTODO {
    constructor() {
        this.threadsObserverService = new ThreadsObserverService();
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