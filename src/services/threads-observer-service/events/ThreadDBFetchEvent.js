const ThreadEvent = require('./ThreadEvent');

/**
 * Class represents data of both Thread and StoredThread instances.
 */
class ThreadDBFetchEvent extends ThreadEvent {
    static name = 'thread-db-fetch';

    /**
     * Create an instance of the class.
     * @param {Thread} thread Observer thread.
     * @param {StoredThread} storedThread Database thread.
     */
    constructor(thread, storedThread) {
        super(thread);
        this.storedThread = storedThread;
    };
};

module.exports = ThreadDBFetchEvent;