/**
 * Base class for the thread events.
 */
class ThreadEvent {

    /**
     * Create an instance of the ThreadEvent class.
     * @param {Thread} thread
     */
    constructor(thread) {
        this.thread = thread;
    };
};

module.exports = ThreadEvent;