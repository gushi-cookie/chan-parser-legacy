const Post = require('./Post');


/**
 * @typedef {Object} ThreadsDiff
 * @property {Thread} thread1
 * @property {Thread} thread2
 * @property {string[]} fields
 * @property {PostArraysDiff} postsDiff
 */


/**
 * Class representing thread data.
 */
class Thread {

    /**
     * Create an instance of the Thread class.
     * @param {number} number 
     * @param {string} title 
     * @param {string} board 
     * @param {number} postersCount 
     * @param {Post[]} posts 
     * @param {number} createTimestamp 
     * @param {number} viewsCount 
     * @param {number} lastPostTimestamp 
     */
    constructor(number, title, board, postersCount, posts, createTimestamp, viewsCount, lastPostTimestamp) {
        this.number = number;
        this.title = title;
        this.board = board;
        this.postersCount = postersCount;
        this.createTimestamp = createTimestamp;
        this.posts = posts;
        this.viewsCount = viewsCount;
        this.lastPostTimestamp = lastPostTimestamp;
        this.isDeleted = false;
    };


    /**
     * Computes files amount in the thread.
     * @returns {number} Files amount.
     */
    getFilesCount() {
        let result = 0;

        this.posts.forEach((post) => {
            result += post.files.length;
        });
        
        return result;
    };


    /**
     * Find differences between two threads.
     * @param {Thread} thread1 First thread
     * @param {Thread} thread2 Second thread
     * @returns {ThreadsDiff | null}
     */
    static diffThreads(thread1, thread2) {
        if(!(thread1 instanceof Thread) || !(thread2 instanceof Thread)) {
            return null;
        } else if(thread1 === thread2) {
            return {thread1: thread1, thread2: thread2, fields: [], postsDiff: null};
        }

        let result = {
            thread1: thread1,
            thread2: thread2,
            fields: [],
            postsDiff: null,
        };

        Object.getOwnPropertyNames(thread1).forEach((name) => {
            if(name !== 'posts' && thread1[name] !== thread2[name]) {
                result.fields.push(name);
            }
        });

        let diffResult = Post.diffPostArrays(thread1.posts, thread2.posts);
        if(diffResult.postsWithoutPair1.length > 0 ||
           diffResult.postsWithoutPair2.length > 0 ||
           diffResult.differences.length > 0) {
            result.postsDiff = diffResult;
            result.fields.push('posts');
        }

        return result;
    };


    /**
     * @param {*} object Parsed data object from 2ch API.
     * @returns {Thread} New Thread instance.
     */
    static parseFrom2chJson(object) {
        let posts = [];
        if(object.threads[0].posts !== null) {
            object.threads[0].posts.forEach((item) => {
                posts.push(Post.parseFrom2chJson(item));
            });
        }

        return new Thread(object.current_thread, object.title, object.board.id, object.unique_posters, posts, posts[0].createTimestamp, 0, posts[posts.length-1].createTimestamp);
    };


    /**
     * @param {*} object Parsed data object from 4chan API.
     * @returns {Thread} New Thread instance.
     */
    static parseFrom4chanJson(object) {
        // TO-DO
    };
};


module.exports = Thread;