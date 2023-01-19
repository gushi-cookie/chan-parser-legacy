const PostEvent = require('./PostEvent');

/**
 * Class representing event data of new posts with replies to another posts.
 */
class PostReplyEvent extends PostEvent {
    static name = 'post-reply';

    /**
     * Create an instance of the PostReplyEvent class.
     * @param {Thread} thread 
     * @param {Post} targetPost 
     * @param {Post} newPost 
     */
    constructor(thread, targetPost, newPost) {
        super(thread, targetPost);
        this.newPost = newPost;
    };
};

module.exports = PostReplyEvent;