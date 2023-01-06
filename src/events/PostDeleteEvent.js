const PostEvent = require("./PostEvent");

module.exports = class PostDeleteEvent extends PostEvent {
    static name = 'post-delete';

    constructor(thread, post, board) {
        super(thread, post, board);
    };
};