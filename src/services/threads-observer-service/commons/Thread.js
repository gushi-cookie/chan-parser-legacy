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
     * @param {number} viewsCount views count.
     * @param {number} lastActivity timestamp when the last time the thread was modified (post add/mod/del; thread closed/sticky).
     * @param {string} imageBoard image board's name.
     */
    constructor(number, title, board, postersCount, posts, createTimestamp, viewsCount, lastActivity, imageBoard) {
        this.id = null;
        
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
     * Compute a posts count of the thread.
     * @returns {number}
     */
    get postsCount() {
        return this.posts.length;
    };

    /**
     * Compute a files count of the thread.
     * @returns {number}
     */
    get filesCount() {
        let count = 0;

        this.posts.forEach(post => {
            count += post.files.length;
        });

        return count;
    };

    /**
     * Check if the thread has a file.
     * @param {File} file 
     * @returns {boolean}
     */
    hasFile(file) {
        for(let i = 0; i < this.files.length; i++) {
            if(this.files[i] === file) {
                return true;
            }
        }
        return false;
    };

    /**
     * Get a post by its id.
     * @param {number} id Id of the post.
     * @returns {Post | null} 
     */
    getPostById(id) {
        for(let i = 0; i < this.posts.length; i++) {
            if(this.posts[i].id === id) {
                return this.posts[i];
            }
        }
        return null;
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
     * Get files from posts.
     * @returns {File[]}
     */
    getFiles() {
        let files = [];
        this.posts.forEach((post) => {
            files = files.concat(post.files);
        });
        return files;
    };


    /**
     * Clone this Thread instance.
     * @returns {Thread} clone of this instance.
     */
    clone() {
        let posts = [];
        this.posts.forEach((post) => {
            posts.push(post.clone());
        });

        let thread = new Thread(this.number, this.title, this.board, this.postersCount, posts, this.createTimestamp, this.viewsCount, this.lastActivity, this.imageBoard);
        thread.id = this.id;
        return thread;
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

        Object.getOwnPropertyNames(thread1).filter(e => e !== 'id' && e !== 'posts').forEach((name) => {
            if(thread1[name] !== thread2[name]) {
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
     * 
     * Note: fields viewsCount and lastActivity are set to 0.
     * 
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
     * Throw parse error.
     * @param {string} name 
     * @param {any} value 
     */
    static _parseError(name, value) {
        throw new Error(`Thread parse error! Field: ${name} is required but ${value} passed.`);
    };


    /**
     * Parse a thread from a raw object.
     * 
     * Note: fields viewsCount and lastActivity are set to 0.
     * 
     * @param {Object} object Parsed data object from 2ch API.
     * @returns {Thread} New Thread instance.
     */
    static parseFrom2chJson(object) {
        ['current_thread', 'title', 'unique_posters'].forEach((field) => {
            if(object[field] === null || object[field] === undefined)
                Thread._parseError(field, object[field]);
        });

        let posts = [];
        if(object.threads[0].posts !== null) {
            object.threads[0].posts.forEach((item, index) => {
                posts.push(Post.parseFrom2chJson(item, index));
            });
        }

        return new Thread(
            Number(object.current_thread), 
            String(object.title), 
            String(object.board.id), 
            Number(object.unique_posters), 
            posts, 
            Number(posts[0].createTimestamp), 
            0, 0, '2ch');
    };


    /**
     * Parse a thread from a raw object.
     *
     * Note: fields viewsCount and lastActivity are set to 0.
     * 
     * @param {string} board Board initials.
     * @param {Object} object Parsed data object from 4chan API.
     * @returns {Thread} New Thread instance.
     */
    static parseFrom4chanJson(board, object) {
        let posts = [];
        object.posts.forEach((post, index) => {
            posts.push(Post.parseFrom4chanJson(board, post, index));
        });

        let op = object.posts[0];
        if(!op.sub) op.sub = '';

        ['no', 'unique_ips', 'time'].forEach((field) => {
            if(op[field] === null || op[field] === undefined) Thread._parseError(field, op[field]);
        });

        return new Thread(
            Number(op.no),  
            String(op.sub), 
            board, 
            Number(op.unique_ips), 
            posts, 
            Number(op.time), 
            0, 0, '4chan');
    };
};


module.exports = Thread;