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

    static diffThreads(thread1, thread2) {
        if(!(thread1 instanceof Thread) || !(thread2 instanceof Thread)) {
            return null;
        } else if(thread1 === thread2) {
            return {fields: [], postsDiff: null};
        }

        let result = {
            fields: [],
            postsDiff: null,
        };

        if(thread1.number !== thread2.number) {
            result.fields.push('number');
        }
        if(thread1.title !== thread2.title) {
            result.fields.push('title');
        }
        if(thread1.board !== thread2.board) {
            result.fields.push('board');
        }
        if(thread1.postersCount !== thread2.postersCount) {
            result.fields.push('postersCount');
        }
        if(thread1.createTimestamp !== thread2.createTimestamp) {
            result.fields.push('createTimestamp');
        }
        if(thread1.viewsCount !== thread2.viewsCount) {
            result.fields.push('viewsCount');
        }
        if(thread1.lastPostTimestamp !== thread2.lastPostTimestamp) {
            result.fields.push('lastPostTimestamp');
        }
        if(thread1.isDeleted !== thread2.isDeleted) {
            result.fields.push('isDeleted');
        }

        let diffResult = Post.diffPostArrays(thread1.posts, thread2.posts);
        if(diffResult.postsWithoutPair1.length > 0 ||
           diffResult.postsWithoutPair2.length > 0 ||
           diffResult.differences.length > 0) {
            result.postsDiff = diffResult;
            result.fields.push('posts');
        }

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
};