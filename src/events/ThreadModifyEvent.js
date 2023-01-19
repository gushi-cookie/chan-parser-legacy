const ThreadEvent = require('./ThreadEvent');

/**
 * Class representing modification event data of a thread.
 */
class ThreadModifyEvent extends ThreadEvent {
    static name = 'thread-modify';

    /**
     * Create an instance of the ThreadModifyEvent class.
     * @param {Thread} thread 
     * @param {ThreadsDiff} threadsDiff 
     */
    constructor(thread, threadsDiff) {
        super(thread);
        this.threadsDiff = threadsDiff;
    };
};

module.exports = ThreadModifyEvent;