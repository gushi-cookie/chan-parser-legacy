const File = require('./File');

module.exports = class Post {
    constructor(number, createTimestamp, name, comment, files, isBanned, isDeleted, isOp) {
        this.number = number;
        this.createTimestamp = createTimestamp;
        this.name = name;
        this.comment = comment;
        this.files = files;
        this.isBanned = isBanned;
        this.isDeleted = isDeleted;
        this.isOp = isOp;
    };


    hasFile(desired) {
        let stored;
        for(let i = 0; i < this.files.length; i++) {
            stored = this.files[i];
            if(desired.equals(stored)) {
                return true;
            }
        };
        
        return false;
    };

    equals(anotherPost) {
        if(!(anotherPost instanceof File)) {
            return false;
        }

        return this.number === anotherPost.number &&
               this.createTimestamp === anotherPost.createTimestamp &&
               this.name === anotherPost.name && 
               this.comment === anotherPost.comment &&
               File.compareFileArrays(this.files, anotherPost.files) &&
               this.isBanned === anotherPost.isBanned &&
               this.isDeleted === anotherPost.isDeleted &&
               this.isOp === anotherPost.isOp;
    };

    static diffPosts(post1, post2) {
        if(!(post1 instanceof Post) || !(post2 instanceof Post)) {
            return null;
        } else if(post1 === post2) {
            return {fields: [], filesDiff: null};
        }

        let result = {
            fields: fields,
            filesDiff: null,
        };

        if(post1.number !== post2.number) {
            result.fields.push('number');
        }
        if(post1.createTimestamp !== post2.createTimestamp) {
            result.fields.push('createTimestamp');
        }
        if(post1.name !== post2.name) {
            result.fields.push('name');
        }
        if(post1.comment !== post2.comment) {
            result.fields.push('comment');
        }
        if(post1.isBanned !== post2.isBanned) {
            result.fields.push('isBanned');
        }
        if(post1.isDeleted !== post2.isDeleted) {
            result.fields.push('isDeleted');
        }
        if(post1.isOp !== post2.isOp) {
            result.fields.push('isOp');
        }

        let diffResult = File.diffFileArrays(post1.files, post2.files);
        if(diffResult.filesWithoutPair1.length > 0 ||
           diffResult.filesWithoutPair2.length > 0 ||
           diffResult.differences.length > 0) {
            result.filesDiff = diffResult;
            result.fields.push('files');
        }

        return result;
    };

    static diffPostArrays(array1, array2) {
        if(!(array1 instanceof Post) || !(array2 instanceof Post)) {
            return null;
        }

        let result = {
            postsWithoutPair1: [],
            postsWithoutPair2: [],
            differences: [],
        };

        let pairs = [];
        let diff;
        array1.forEach((post1) => {
            array2.forEach((post2) => {
                if(post1.number === post2.number) {
                    pairs.push({post1: post1, post2: post2});
                    diff = Post.diffPosts(post1, post2);
                    if(diff.fields.length !== 0) {
                        result.push({
                            post1: post1,
                            post2: post2,
                            difference: diff,
                        });
                    }
                }
            });
        });

        array1.forEach((post) => {
            pairs.forEach((pair, index) => {
                if(pairs.length-1 === index && pair.post1 !== post) {
                    result.postsWithoutPair1.push(post);
                }
            });
        });

        array2.forEach((post) => {
            pairs.forEach((pair, index) => {
                if(pairs.length-1 === index && pair.post2 !== post) {
                    result.postsWithoutPair2.push(post);
                }
            });
        });

        return result;
    };

    static parseFrom2chJson(obj) {
        let files = [];
        if(obj.files !== null) {
            obj.files.forEach((item) => {
                files.push(File.parseFrom2chJson(item));
            });
        }
        
        return new Post(obj.num, obj.timestamp, obj.name, obj.comment, files, 
                        obj.banned ? true : false,
                        false,
                        obj.op ? true : false);
    };

    static parseFrom4chanJson(obj) {
        // TO-DO
    };
};