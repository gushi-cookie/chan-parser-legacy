const DBUtils = require('./DBUtils');
const StoredPost = require('./StoredPost');
const FileQueries = require('./FileQueries');


/**
 * Class represents queries for working with the posts table.
 */
class PostQueries {

    /**
     * Create an instance of the PostQueries class.
     * @param {Database} database 
     * @param {FileQueries} fileQueries 
     * @throws {SQLiteError}
     */
    constructor(database, fileQueries) {
        this.database = database;
        this.fileQueries = fileQueries;
    };


    /**
     * Create posts table if not exists, in the database.
     * @throws {SQLiteError}
     */
    async createTable() {
        let sql = 
        `CREATE TABLE IF NOT EXISTS posts (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id        INTEGER NOT NULL,
            number           INTEGER NOT NULL,
            list_index       INTEGER NOT NULL,
            create_timestamp INTEGER NOT NULL,
            name             TEXT NOT NULL,
            comment          TEXT NOT NULL,
            is_banned        INTEGER NOT NULL,
            is_deleted       INTEGER NOT NULL,
            is_op            INTEGER NOT NULL,
            FOREIGN KEY (thread_id)
                REFERENCES threads (id)
                ON DELETE CASCADE
                ON UPDATE NO ACTION
        );`;

        await DBUtils.wrapExecQuery(sql, this.database);
    };

    /**
     * Select the first post of a specific thread.
     * @param {number} threadId 
     * @returns {Promise.<StoredPost | null>}
     * @throws {SQLiteError}
     */
    async selectFirstPostOfThread(threadId) {
        let sql = `SELECT * FROM posts WHERE thread_id = ${threadId} AND list_index = 1;`;
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);

        if(row !== null) {
            return StoredPost.makeFromTableRow(row);
        } else {
            return null;
        }
    };

    /**
     * Select all posts of a specific thread.
     * @param {number} threadId 
     * @returns {Promise.<StoredPost[]>}
     * @throws {SQLiteError}
     */
    async selectPostsOfThread(threadId) {
        let sql = `SELECT * FROM posts WHERE thread_id = ${threadId};`;
        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let posts = [];
        for(let i = 0; i < rows.length; i++) {
            posts.push(StoredPost.makeFromTableRow(rows[i]));
        }
        return posts;
    };


    /**
     * Insert a post in the posts table.
     * 
     * Note: id property of the post may be null.
     * @param {StoredPost} post Post to be inserted.
     * @returns {Promise.<number>} Id of the inserted post.
     * @throws {SQLiteError}
     */
    async insertPost(post) {
        let sql =
        `INSERT INTO posts(id, thread_id, number, list_index, create_timestamp, name, comment, is_banned, is_deleted, is_op)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        let result = await DBUtils.wrapRunQuery(sql, [post.id, post.threadId, post.number, post.listIndex, post.createTimestamp, post.name, post.comment, post.isBanned, post.isDeleted, post.isOp], this.database);
        return result.lastID;
    };


    /**
     * Update columns of a stored post in the posts table.
     * 
     * Note: id property shouldn't be null. threadId property may be null.
     * @param {StoredPost} post Post to be updated.
     * @param {String[]} fields Names of the StoredPost class's fields to update.
     * @throws {SQLiteError}
     */
    async updatePost(post, fields) {
        let sets = '';
        fields.forEach((field) => {
            sets += `${StoredPost.convertFieldToSnakeCase(field)} = ?,`;
        });
        sets = sets.slice(0, sets.length - 1);

        let sql = `UPDATE posts SET ${sets} WHERE id = ${post.id};`;

        let params = [];
        fields.forEach((field) => {
            params.push(post[field]);
        });

        await DBUtils.wrapRunQuery(sql, params, this.database);
    };
};

module.exports = PostQueries;