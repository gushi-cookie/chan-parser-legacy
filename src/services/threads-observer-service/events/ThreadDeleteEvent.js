const ThreadEvent = require('./ThreadEvent');

/**
 * Class representing deletion event data of a thread.
 */
class ThreadDeleteEvent extends ThreadEvent {
    static name = 'thread-delete';

    /**
     * Create an instance of the ThreadDeleteEvent class.
     * @param {Thread} thread
     */
    constructor(thread) {
        super(thread);
    };
};

module.exports = ThreadDeleteEvent;