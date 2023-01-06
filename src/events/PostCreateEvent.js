const PostEvent = require("./PostEvent");

module.exports = class PostCreateEvent extends PostEvent {
    static name = 'post-create';

    constructor(thread, post, board) {
        super(thread, post, board);
    };
};