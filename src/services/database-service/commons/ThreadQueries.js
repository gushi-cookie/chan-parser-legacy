const Thread = require('../../threads-observer-service/commons/Thread');
const DBUtils = require('./DBUtils');

class ThreadQueries {
    constructor(database, fileQueries, postQueries) {
        this.database = database;
        this.fileQueries = fileQueries;
        this.postQueries = postQueries;
    };

    async createTable() {
        let sql = 
        `CREATE TABLE IF NOT EXISTS threads (
            id               PRIMARY KEY,
            board            TEXT NOT NULL,
            image_board      TEXT NOT NULL,
            number           INTEGER NOT NULL,
            title            TEXT NOT NULL,
            posters_count    INTEGER NOT NULL,
            create_timestamp INTEGER NOT NULL,
            views_count      INTEGER NOT NULL,
            last_activity    INTEGER NOT NULL
        );`;

        await DBUtils.wrapExecQuery(sql, this.database);
    };


    /**
     * 
     * @param {string} imageBoard 
     * @param {string} board 
     * @param {number} id 
     * @param {boolean} firstPostOnly 
     * @returns {Promise.<Thread | null>}
     */
    async selectThread(imageBoard, board, id, firstPostOnly) {
        let sql = `SELECT * FROM threads WHERE image_board = '${imageBoard}' AND board = '${board}' AND id = ${id};`;
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);
        
        if(row === null) return null;

        let posts;
        if(firstPostOnly) {
            posts = [];
            let post = await this.postQueries.selectFirstPostOfThread(row.id);
            if(post !== null) posts.push(post);
        } else {
            posts = await this.postQueries.selectPostsOfThread(row.id);
        }

        let thread = new Thread(row.number, row.title, row.board, row.posters_count, posts, row.create_timestamp, row.views_count, row.last_activity, row.image_board);
        thread.id = row.id;
        return thread;
    };

    /**
     * 
     * @param {*} imageBoard 
     * @param {*} board 
     * @param {*} firstPostOnly 
     * @returns 
     */
    async selectThreads(imageBoard, board, firstPostOnly) {
        let sql = `SELECT * FROM threads WHERE image_board = '${imageBoard}' AND board = '${board}';`;
        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let threads = [];
        let posts;
        let thread;
        let row;
        for(let i = 0; i < rows.length; i++) {
            row = rows[i];

            if(firstPostOnly) {
                posts = [];
                let post = await this.postQueries.selectFirstPostOfThread(row.id);
                if(post !== null) posts.push(post);
            } else {
                posts = await this.postQueries.selectPostsOfThread(row.id);
            }

            thread = new Thread(row.number, row.title, row.board, row.posters_count, posts, row.create_timestamp, row.views_count, row.last_activity, row.image_board);
            thread.id = row.id;
            threads.push(thread);
        }

        return threads;
    };
};

module.exports = ThreadQueries;