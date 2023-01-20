const PostEvent = require('./PostEvent');

/**
 * Class representing deletion event data of a post.
 */
class PostDeleteEvent extends PostEvent {
    static name = 'post-delete';

    /**
     * Create an instance of the PostDeleteEvent class.
     * @param {Thread} thread 
     * @param {Post} post 
     */
    constructor(thread, post) {
        super(thread, post);
    };
};

module.exports = PostDeleteEvent;