const PostEvent = require('./PostEvent');

/**
 * Class representing creation event data of a post.
 */
class PostCreateEvent extends PostEvent {
    static name = 'post-create';

    /**
     * Create an instance of the PostCreateEvent class.
     * @param {Thread} thread 
     * @param {Post} post
     */
    constructor(thread, post) {
        super(thread, post);
    };
};

module.exports = PostCreateEvent;