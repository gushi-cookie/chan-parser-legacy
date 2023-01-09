const Post = require('./Post');

module.exports = class Thread {
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


    getFilesCount() {
        let result = 0;

        this.posts.forEach((post) => {
            result += post.files.length;
        });
        
        return result;
    };


    static parseFrom2chJson(obj) {
        let posts = [];
        if(obj.threads[0].posts !== null) {
            obj.threads[0].posts.forEach((item) => {
                posts.push(Post.parseFrom2chJson(item));
            });
        }

        return new Thread(obj.current_thread, obj.title, obj.board.id, obj.unique_posters, posts, posts[0].createTimestamp, 0, posts[posts.length-1].createTimestamp);
    };

    static parseFrom4chanJson(obj) {
        // TO-DO
    };

    static 
};