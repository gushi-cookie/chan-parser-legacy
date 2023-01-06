const ThreadEvent = require("./ThreadEvent");

module.exports = class ThreadCreateEvent extends ThreadEvent {
    static name = 'thread-create';

    constructor(thread, board) {
        super(thread, board);
    };
};