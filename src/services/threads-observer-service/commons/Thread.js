const Post = require('./Post');

module.exports = class Thread {
    constructor(number, title, board, postersCount, viewsCount, posts, createTimestamp) {
        this.number = number;
        this.title = title;
        this.board = board;
        this.postersCount = postersCount;
        this.viewsCount = viewsCount;
        this.posts = posts;
        this.createTimestamp = createTimestamp;
    };


    getFilesCount() {
        let result = 0;

        this.posts.forEach((post) => {
            result += post.files.length;
        });
        
        return result;
    };


    static parseFrom2chJson(obj, viewsCount = 0, createTimestamp = 0) {
        let posts = [];
        if(obj.threads[0].posts !== null) {
            obj.threads[0].posts.forEach((item) => {
                posts.push(Post.parseFrom2chJson(item));
            });
        }

        return new Thread(obj.current_thread, obj.title, obj.board.id, obj.unique_posters, viewsCount, posts, createTimestamp);
    };

    static parseFrom4chanJson(obj) {
        // TO-DO
    };
};