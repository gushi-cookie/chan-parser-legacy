const ThreadEvent = require("./ThreadEvent");

module.exports = class ThreadDiffEvent extends ThreadEvent {
    static name = 'thread-diff';

    /**
     * @param {Thread} thread 
     * @param {string} board 
     * @param {ThreadsDiff} threadsDiff 
     */
    constructor(thread, board, threadsDiff) {
        super(thread, board);
        this.threadsDiff = threadsDiff;
    };
}