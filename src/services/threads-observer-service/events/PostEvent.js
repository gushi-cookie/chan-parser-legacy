/**
 * Base class for the post events.
 */
class PostEvent {

    /**
     * Create an instance of the PostEvent class.
     * @param {Thread} thread 
     * @param {Post} post
     */
    constructor(thread, post) {
        this.thread = thread;
        this.post = post;
    };
};

module.exports = PostEvent;