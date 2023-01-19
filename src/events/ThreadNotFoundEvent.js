const ThreadEvent = require('./ThreadEvent');

/**
 * Class representing a thread that couldn't be fetched due to 404 status code.
 */
class ThreadNotFoundEvent extends ThreadEvent {
    static name = 'thread-not-found';

    /**
     * Create an instance of the ThreadNotFoundEvent class.
     * 
     * Note: the thread property is null.
     * @param {CatalogThread} catalogThread 
     */
    constructor(catalogThread) {
        super(null);
        this.catalogThread = catalogThread;
    }
};

module.exports = ThreadNotFoundEvent;