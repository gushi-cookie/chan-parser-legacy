const PostEvent = require('./PostEvent');

/**
 * Class represents data of both Post and StoredPost instances.
 */
class PostDBFetchEvent extends PostEvent {
    static name = 'post-db-fetch';

    /**
     * Create an instance of the class.
     * @param {Thread} thread Thread associated with a post.
     * @param {Post} post Observer post. 
     * @param {StoredPost} storedPost Database post.
     */
    constructor(thread, post, storedPost) {
        super(thread, post);
        this.storedPost = storedPost;
    };
};

module.exports = PostDBFetchEvent;