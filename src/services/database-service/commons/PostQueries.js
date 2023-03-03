const Post = require('../../threads-observer-service/commons/Post');
const DBUtils = require('./DBUtils');

class PostQueries {
    constructor(database, fileQueries) {
        this.database = database;
        this.fileQueries = fileQueries;
    };

    async createTable() {
        let sql = 
        `CREATE TABLE IF NOT EXISTS posts (
            id               PRIMARY KEY,
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
     * 
     * @param {number} threadId 
     * @returns {Promise.<Post | null>}
     */
    async selectFirstPostOfThread(threadId) {
        let sql = `SELECT * FROM posts WHERE thread_id = ${threadId} AND index = 1;`;
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);

        if(row === null) return null;

        let files = await this.fileQueries.selectFilesOfPost(row.id);
        let post = new Post(row.list_index, row.number, row.create_timestamp, row.name, row.comment, files, row.is_banned, row.is_deleted, row.is_op);
        post.id = row.id;
        return post;
    };

    /**
     * 
     * @param {number} threadId 
     * @returns {Array.<Post>}
     */
    async selectPostsOfThread(threadId) {
        let sql = `SELECT * FROM posts WHERE thread_id = ${threadId};`;
        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let posts = [];
        let row;
        let post;
        let files;
        for(let i = 0; i < rows.length; i++) {
            row = rows[i];
            files = await this.fileQueries.selectFilesOfPost(row.id);

            post = new Post(row.list_index, row.number, row.create_timestamp, row.name, row.comment, files, row.is_banned, row.is_deleted, row.is_op);
            post.id = row.id;

            posts.push(post);
        }

        return posts;
    };
};

module.exports = PostQueries;