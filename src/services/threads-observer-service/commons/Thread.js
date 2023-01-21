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
     * @param {number} number thread id.
     * @param {string} title first post subject.
     * @param {string} board board initials.
     * @param {number} postersCount unique posters count.
     * @param {Post[]} posts posts array.
     * @param {number} createTimestamp first post timestamp.
     * @param {number} viewsCount views count (may be 0).
     * @param {number} lastActivity timestamp when the last time the thread was modified (post add/mod/del; thread closed/sticky).
     * @param {string} imageBoard image board's name.
     */
    constructor(number, title, board, postersCount, posts, createTimestamp, viewsCount, lastActivity, imageBoard) {
        this.number = number;
        this.title = title;
        this.board = board;
        this.postersCount = postersCount;
        this.createTimestamp = createTimestamp;
        this.posts = posts;
        this.viewsCount = viewsCount;
        this.lastActivity = lastActivity;
        this.isDeleted = false;
        this.imageBoard = imageBoard;
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
     * Parse a raw thread object, depending on the image board.
     * @param {string} imageBoard
     * @param {string} board
     * @param {Object} object 
     * @returns {Thread | null} Thread
     */
    static parseFromJson(imageBoard, board, object) {
        if(imageBoard === '4chan') {
            return Thread.parseFrom4chanJson(board, object);
        } else if(imageBoard === '2ch') {
            return Thread.parseFrom2chJson(object);
        } else {
            return null;
        }
    };
    

    /**
     * Parse a thread from a raw object.
     * @param {Object} object Parsed data object from 2ch API.
     * @returns {Thread} New Thread instance.
     */
    static parseFrom2chJson(object) {
        let posts = [];
        if(object.threads[0].posts !== null) {
            object.threads[0].posts.forEach((item) => {
                posts.push(Post.parseFrom2chJson(item));
            });
        }

        return new Thread(object.current_thread, object.title, object.board.id, object.unique_posters, posts, posts[0].createTimestamp, 0, 0, '2ch');
    };


    /**
     * Parse a thread from a raw object.
     * @param {string} board Board initials.
     * @param {Object} object Parsed data object from 4chan API.
     * @returns {Thread} New Thread instance.
     */
    static parseFrom4chanJson(board, object) {
        let posts = [];
        object.posts.forEach((post) => {
            posts.push(Post.parseFrom4chanJson(board, post));
        });

        let op = object.posts[0];
        return new Thread(op.no, op.sub, board, op.unique_ips, posts, op.time, op.unique_ips, 0, '4chan');
    };
};


module.exports = Thread;