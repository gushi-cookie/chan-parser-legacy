const PostEvent = require("./PostEvent");

module.exports = class PostReplyEvent extends PostEvent {
    static name = 'post-reply';

    constructor(thread, post, board, initiator) {
        super(thread, post, board);
        this.initiator = initiator;
    };
};