const ThreadEvent = require("./ThreadEvent");

module.exports = class ThreadDeleteEvent extends ThreadEvent {
    static name = 'thread-delete';

    constructor(thread, board) {
        super(thread, board);
    };
}