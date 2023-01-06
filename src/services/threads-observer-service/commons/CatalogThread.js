module.exports = class CatalogThread {
    constructor(number, createTimestamp, viewsCount, postsCount, lastPostTimestamp, board) {
        this.number = number;
        this.createTimestamp = createTimestamp;
        this.viewsCount = viewsCount;
        this.postsCount = postsCount;
        this.lastPostTimestamp = lastPostTimestamp;
        this.board = board;
    };

    static parseFrom2chJson(obj) {
        return new CatalogThread(obj.num, obj.timestamp, obj.views, obj.posts_count, obj.lasthit, obj.board);
    };

    static parseFrom4chanJson(obj) {
        // TO-DO
    };
};