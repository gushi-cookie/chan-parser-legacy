const Post = require("../../threads-observer-service/commons/Post");
const Thread = require("../../threads-observer-service/commons/Thread");
const DBUtils = require('./DBUtils');

/**
 * Class represents the threads database table.
 */
class StoredThread {
    /**
     * Create an instance of the StoredThread class.
     * @param {number} id 
     * @param {string} board 
     * @param {string} imageBoard 
     * @param {number} number 
     * @param {string} title 
     * @param {number} postersCount 
     * @param {number} createTimestamp 
     * @param {number} viewsCount 
     * @param {number} lastActivity 
     */
    constructor(id, board, imageBoard, number, title, postersCount, createTimestamp, viewsCount, lastActivity, isDeleted) {
        this.id = id;
        this.board = board;
        this.imageBoard = imageBoard;
        this.number = number;
        this.title = title;
        this.postersCount = postersCount;
        this.createTimestamp = createTimestamp;
        this.viewsCount = viewsCount;
        this.lastActivity = lastActivity;
        this.isDeleted = isDeleted;
    };


    /**
     * Convert a class's field to snake case. 
     * @param {string} name Name of the field.
     * @throws {Error} Thrown if a prototype of the class has no property with the passed name.
     */
    static convertFieldToSnakeCase(name) {
        if(!Object.getOwnPropertyNames(new StoredThread()).includes(name)) {
            throw new Error(`Class StoredThread has no a field with the name: ${name}.`);
        }
        return DBUtils.camelToSnakeCase(name);
    };


    /**
     * Create a StoredThread instance from the thread table row.
     * 
     * Note: all columns from the table are required, except for NULLABLE ones.
     * @param {object} row 
     * @returns {StoredThread}
     */
    static makeFromTableRow(row) {
        return new StoredThread(row.id, row.board, row.image_board, row.number, row.title, row.posters_count, row.create_timestamp, row.views_count, row.last_activity, Boolean(row.is_deleted));
    };

    /**
     * Form a StoredThread instance from an observer Thread instance.
     * @param {Thread} thread
     * @returns {StoredThread}
     */
    static makeFromObserverThread(thread) {
        return new StoredThread(thread.id, thread.board, thread.imageBoard, thread.number, thread.title, thread.postersCount, thread.createTimestamp, thread.viewsCount, thread.lastActivity, thread.isDeleted);
    };


    /**
     * Convert this thread to the Thread type of the ThreadsObserverService service.
     * @param {Array.<Post>} posts The thread's posts.
     * @returns {Thread}
     */
    toObserverThread(posts) {
        let thread = new Thread(this.number, this.title, this.board, this.postersCount, posts, this.createTimestamp, this.viewsCount, this.lastActivity, this.imageBoard);
        thread.id = this.id;
        return thread;
    }
};

module.exports = StoredThread;