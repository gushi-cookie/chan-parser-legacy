const PostEvent = require('./PostEvent');

/**
 * Class representing modification event data of a post.
 */
class PostModifyEvent extends PostEvent {
    static name = 'post-modify';

    /**
     * Create an instance of the PostModifyEvent class.
     * @param {Thread} thread 
     * @param {Post} post
     * @param {PostsDiff} postsDiff 
     */
    constructor(thread, post, postsDiff) {
        super(thread, post);
        this.postsDiff = postsDiff;
    };
};

module.exports = PostModifyEvent;