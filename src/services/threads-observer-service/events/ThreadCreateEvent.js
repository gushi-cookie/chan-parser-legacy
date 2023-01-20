const ThreadEvent = require('./ThreadEvent');

/**
 * Class representing creation event data of a thread.
 */
class ThreadCreateEvent extends ThreadEvent {
    static name = 'thread-create';

    /**
     * Create an instance of the ThreadCreateEvent class.
     * @param {Thread} thread 
     */
    constructor(thread) {
        super(thread);
    };
};

module.exports = ThreadCreateEvent;