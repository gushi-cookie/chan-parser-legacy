const blessed = require('blessed');

module.exports = class ThreadsWidget {
    constructor(threadsObserverService) {
        this.threadsObserverService = threadsObserverService;
    };
};