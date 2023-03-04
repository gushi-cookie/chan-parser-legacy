const Post = require("../../threads-observer-service/commons/Post");
const Thread = require("../../threads-observer-service/commons/Thread");

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
    constructor(id, board, imageBoard, number, title, postersCount, createTimestamp, viewsCount, lastActivity) {
        this.id = id;
        this.board = board;
        this.imageBoard = imageBoard;
        this.number = number;
        this.title = title;
        this.postersCount = postersCount;
        this.createTimestamp = createTimestamp;
        this.viewsCount = viewsCount;
        this.lastActivity = lastActivity;
    };


    /**
     * Create a StoredThread instance from the thread table row.
     * 
     * Note: all columns from the table are required, except for NULLABLE ones.
     * @param {object} row 
     * @returns {StoredThread}
     */
    static makeFromTableRow(row) {
        return new StoredThread(row.id, row.board, row.image_board, row.number, row.title, row.posters_count, row.create_timestamp, row.views_count, row.last_activity);
    };

    /**
     * Convert this thread to the Thread type of the ThreadsObserverService service.
     * @param {Array.<Post>} posts The thread's posts.
     * @returns {Thread}
     */
    toObserverThread(posts) {
        return new Thread(this.number, this.title, this.board, this.postersCount, posts, this.createTimestamp, this.viewsCount, this.lastActivity, this.imageBoard);
    }
};

module.exports = StoredThread;