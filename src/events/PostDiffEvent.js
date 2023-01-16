const PostEvent = require("./PostEvent");

/**
 * Type storing posts diff event data.
 */
class PostDiffEvent extends PostEvent {
    static name = 'post-diff';

    /**
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {string} board 
     * @param {PostsDiff} postsDiff 
     */
    constructor(thread, post, board, postsDiff) {
        super(thread, post, board);
        this.postsDiff = postsDiff;
    };
};

module.exports = PostDiffEvent;