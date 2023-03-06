const Post = require("../../threads-observer-service/commons/Post");
const DBUtils = require('./DBUtils');

/**
 * Class represents the posts database table.
 */
class StoredPost {
    /**
     * Create an instance of the StoredPost class.
     * @param {number} id 
     * @param {number} threadId 
     * @param {number} number 
     * @param {number} listIndex 
     * @param {number} createTimestamp 
     * @param {string} name 
     * @param {string} comment 
     * @param {boolean} isBanned 
     * @param {boolean} isDeleted 
     * @param {boolean} isOp 
     */
    constructor(id, threadId, number, listIndex, createTimestamp, name, comment, isBanned, isDeleted, isOp) {
        this.id = id;
        this.threadId = threadId;
        this.number = number;
        this.listIndex = listIndex;
        this.createTimestamp = createTimestamp;
        this.name = name;
        this.comment = comment;
        this.isBanned = isBanned;
        this.isDeleted = isDeleted;
        this.isOp = isOp;
    };


    /**
     * Convert a class's field to snake case. 
     * @param {string} name Name of the field.
     * @throws {Error} Thrown if a prototype of the class has no property with the passed name.
     */
    static convertFieldToSnakeCase(name) {
        if(!Object.getOwnPropertyNames(new StoredPost()).includes(name)) {
            throw new Error(`Class StoredPost has no a field with the name: ${name}.`);
        }
        return DBUtils.camelToSnakeCase(name);
    };


    /**
     * Create a StoredPost instance from the posts table row.
     * 
     * Note: all columns from the table are required, except for NULLABLE ones.
     * @param {object} row 
     * @returns {StoredPost}
     */
    static makeFromTableRow(row) {
        return new StoredPost(row.id, row.thread_id, row.number, row.list_index, row.create_timestamp, row.name, row.comment, Boolean(row.is_banned), Boolean(row.is_deleted), Boolean(row.is_op));
    };

    /**
     * Form a StoredPost instance from an observer Post instance.
     * @param {Post} post
     * @returns {StoredPost}
     */
    static makeFromObserverPost(post) {
        return new StoredPost(post.id, post.threadId, post.number, post.listIndex, post.createTimestamp, post.name, post.comment, post.isBanned, post.isDeleted, post.isOp);
    };


    /**
     * Convert this post to the Post type of the ThreadsObserverService service.
     * @param {Array.<File>} files Files of the post.
     * @returns {Post}
     */
    toObserverPost(files) {
        return new Post(this.listIndex, this.number, this.createTimestamp, this.name, this.comment, files, this.isBanned, this.isDeleted, this.isOp);
    };
};

module.exports = StoredPost;