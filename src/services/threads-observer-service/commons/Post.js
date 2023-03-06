const File = require('./File');


/**
 * @typedef {Object} PostsDiff
 * @property {Post} post1
 * @property {Post} post2
 * @property {string[]} fields
 * @property {FileArraysDiff} filesDiff
 */

/**
 * @typedef {Object} PostArraysDiff
 * @property {Post[]} postsWithoutPair1
 * @property {Post[]} postsWithoutPair2
 * @property {PostsDiff[]} differences
 */


/**
 * Class representing post data.
 */
class Post {

    /**
     * Create an instance of the Post class.
     * @param {number} listIndex
     * @param {number} number 
     * @param {number} createTimestamp 
     * @param {string} name 
     * @param {string} comment 
     * @param {File[]} files 
     * @param {boolean} isBanned 
     * @param {boolean} isDeleted 
     * @param {boolean} isOp 
     */
    constructor(listIndex, number, createTimestamp, name, comment, files, isBanned, isDeleted, isOp) {
        this.id = null;

        this.listIndex = listIndex;
        this.number = number;
        this.createTimestamp = createTimestamp;
        this.name = name;
        this.comment = comment;
        this.files = files;
        this.isBanned = isBanned;
        this.isDeleted = isDeleted;
        this.isOp = isOp;
    };


    /**
     * Check if post has file.
     * @param {File} file 
     * @returns {boolean}
     */
    hasFile(file) {
        if(!(file instanceof File)) {
            return false;
        }

        let stored;
        for(let i = 0; i < this.files.length; i++) {
            stored = this.files[i];
            if(file.equals(stored)) {
                return true;
            }
        };
        
        return false;
    };


    /**
     * Check if posts equal.
     * @param {Post} anotherPost 
     * @returns {boolean}
     */
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


    /**
     * Clone this Post instance.
     * @returns {Post} clone of this instance.
     */
    clone() {
        let files = [];
        this.files.forEach((file) => {
            files.push(file.clone());
        });

        let post = new Post(this.listIndex, this.number, this.createTimestamp, this.name, this.comment, files, this.isBanned, this.isDeleted, this.isOp);
        post.id = this.id;
        return post;
    };
    

    /**
     * Find differences between two posts.
     * @param {Post} post1 First post
     * @param {Post} post2 Second post
     * @returns {PostsDiff}
     */
    static diffPosts(post1, post2) {
        if(!(post1 instanceof Post) || !(post2 instanceof Post)) {
            return null;
        } else if(post1 === post2) {
            return {post1: post1, post2: post2, fields: [], filesDiff: null};
        }

        let result = {
            post1: post1,
            post2: post2,
            fields: [],
            filesDiff: null,
        };

        Object.getOwnPropertyNames(post1).filter(e => e !== 'id').forEach((name) => {
            if(name !== 'files' && post1[name] !== post2[name]) {
                result.fields.push(name);
            }
        });

        let diffResult = File.diffFileArrays(post1.files, post2.files);
        if(diffResult.filesWithoutPair1.length > 0 ||
           diffResult.filesWithoutPair2.length > 0 ||
           diffResult.differences.length > 0) {
            result.filesDiff = diffResult;
            result.fields.push('files');
        }

        return result;
    };


    /**
     * 
     * @param {Post[]} array1 
     * @param {Post[]} array2 
     * @returns {PostArraysDiff | null}
     */
    static diffPostArrays(array1, array2) {
        if(!(array1 instanceof Array) || !(array2 instanceof Array)) {
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
                        result.differences.push(diff);
                    }
                    return;
                }
            });
        });


        array1.forEach((post) => {
            if(pairs.length === 0) {
                result.postsWithoutPair1.push(post);
                return;
            }

            for(let i = 0; i < pairs.length; i++) {
                if(pairs[i].post1 === post) {
                    break;
                } else if(pairs.length - 1 === i) {
                    result.postsWithoutPair1.push(post);
                }
            }
        });

        array2.forEach((post) => {
            if(pairs.length === 0) {
                result.postsWithoutPair2.push(post);
                return;
            }

            for(let i = 0; i < pairs.length; i++) {
                if(pairs[i].post2 === post) {
                    break;
                } else if(pairs.length - 1 === i) {
                    result.postsWithoutPair2.push(post);
                }
            }
        });

        return result;
    };


    /**
     * Throw parse error.
     * @param {string} name 
     * @param {any} value 
     */
    static _parseError(name, value) {
        throw new Error(`Post parse error! Field: ${name} is required but ${value} passed.`);
    };


    /**
     * @param {*} object Parsed data object from 2ch API.
     * @param {number} listIndex The post's index in posts list.
     * @returns {Post} New Post instance.
     */
    static parseFrom2chJson(object, listIndex) {
        ['num', 'timestamp', 'name', 'comment', 'banned', 'op'].forEach((field) => {
            if(object[field] === null || object[field] === undefined)
                Post._parseError(field, object[field]);
        });

        let files = [];
        if(object.files !== null) {
            object.files.forEach((item, index) => {
                files.push(File.parseFrom2chJson(item, index));
            });
        }
        
        return new Post(
            listIndex, 
            Number(object.num), 
            Number(object.timestamp), 
            String(object.name), 
            String(object.comment), 
            files,      
            Boolean(object.banned),
            false,
            Boolean(object.op));
    };


    /**
     * @param {string} board
     * @param {*} object Parsed data object from 4chan API.
     * @param {number} listIndex The post's index in posts list.
     * @returns {Post} New Post instance.
     */
    static parseFrom4chanJson(board, object, listIndex) {
        ['no', 'time', 'name'].forEach((field) => {
            if(object[field] === null || object[field] === undefined)
                Post._parseError(field, object[field]);
        });

        let files = [];
        if(object.filename !== undefined) {
            files.push(File.parseFrom4canJson(board, object, 0));
        }

        return new Post(
            listIndex, 
            Number(object.no), 
            Number(object.time), 
            String(object.name), 
            object.com ? String(object.com) : '', 
            files, false, false, 
            object.sub !== undefined);
    };
};


module.exports = Post;