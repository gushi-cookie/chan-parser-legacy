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
     * @param {number} number 
     * @param {number} createTimestamp 
     * @param {string} name 
     * @param {string} comment 
     * @param {File[]} files 
     * @param {boolean} isBanned 
     * @param {boolean} isDeleted 
     * @param {boolean} isOp 
     */
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
            fields: fields,
            filesDiff: null,
        };

        Object.getOwnPropertyNames(post1).forEach((name) => {
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
                        result.differences.push(diff);
                    }
                }
            });
        });


        let pair;
        array1.forEach((post) => {
            for(let i = 0; i < pairs.length - 1; i++) {
                if(pair.post1 === post) {
                    break;
                } else if(pairs.length - 1 === i) {
                    result.postsWithoutPair1.push(post);
                }
            }
        });

        array2.forEach((post) => {
            for(let i = 0; i < pairs.length - 1; i++) {
                if(pair.post2 === post) {
                    break;
                } else if(pairs.length - 1 === i) {
                    result.postsWithoutPair2.push(post);
                }
            }
        });

        return result;
    };


    /**
     * @param {*} object Parsed data object from 2ch API.
     * @returns {Post} New Post instance.
     */
    static parseFrom2chJson(object) {
        let files = [];
        if(object.files !== null) {
            object.files.forEach((item) => {
                files.push(File.parseFrom2chJson(item));
            });
        }
        
        return new Post(object.num, object.timestamp, object.name, object.comment, files, 
                        object.banned ? true : false,
                        false,
                        object.op ? true : false);
    };


    /**
     * @param {*} object Parsed data object from 4chan API.
     * @returns {Post} New Post instance.
     */
    static parseFrom4chanJson(object) {
        // TO-DO
    };
};


module.exports = Post;