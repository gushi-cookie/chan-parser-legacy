/**
 * @typedef {Object} FilesDiff
 * @property {File} file1
 * @property {File} file2
 * @property {string[]} fields
 */

/**
 * @typedef {Object} FileArraysDiff
 * @property {File[]} filesWithoutPair1
 * @property {File[]} filesWithoutPair2
 * @property {FilesDiff[]} differences
 */


/**
 * Class representing file data.
 */
class File {

    /**
     * Create an instance of the File class.
     * @param {number} listIndex
     * @param {string} url 
     * @param {string} thumbnailUrl 
     * @param {string} uploadName 
     * @param {string} cdnName 
     * @param {string} checkSum 
     * @param {boolean} isDeleted
     * 
     * @returns {File} New file instance
     */
    constructor(listIndex, url, thumbnailUrl, uploadName, cdnName, checkSum, isDeleted) {
        this.id = null;

        this.listIndex = listIndex;
        this.url = url;
        this.thumbnailUrl = thumbnailUrl;
        this.uploadName = uploadName;
        this.cdnName = cdnName;
        this.checkSum = checkSum;
        this.isDeleted = isDeleted;
    };


    /**
     * Checks if two files are equal.
     * @param {File} anotherFile 
     * @returns {boolean}
     */
    equals(anotherFile) {
        if(!(anotherFile instanceof File)) {
            return false;
        }

        return this.url === anotherFile.url &&
               this.thumbnailUrl === anotherFile.thumbnailUrl &&
               this.uploadName === anotherFile.uploadName &&
               this.cdnName === anotherFile.cdnName &&
               this.checkSum === anotherFile.checkSum;
    };


    /**
     * Clone this File instance.
     * @returns {File} clone of this instance.
     */
    clone() {
        let file = new File(this.listIndex, this.url, this.thumbnailUrl, this.uploadName, this.cdnName, this.checkSum, this.isDeleted);
        file.id = this.id;
        return file;
    };


    /**
     * Checks if two File arrays are equal.
     * @param {File[]} array1 First file array
     * @param {File[]} array2 Second file array
     * @returns {boolean} Compare result
     */
    static compareFileArrays(array1, array2) {
        if(!(array1 instanceof Array) || !(array2 instanceof Array)) {
            return false;
        }else if(array1.length !== array2.length) {
            return false;
        }

        let file1;
        let file2;
        for(let i = 0; i < array1.length; i++) {
            file1 = array1[i];
            for(let j = 0; j < array2.length; j++) {
                file2 = array2[j];
                if(file1.equals(file2)) {
                    continue;
                } else if(array2.length -1 === j) {
                    return false;
                }
            }
        }

        return true;
    };


    /**
     * Find differences between two files.
     * @param {File} file1 First file
     * @param {File} file2 Second file
     * 
     * @returns {FilesDiff | null} Property names that differ
     */
    static diffFiles(file1, file2) {
        if(!(file1 instanceof File) || !(file2 instanceof File)) {
            return null;
        } else if(file1 === file2) {
            return [];
        }

        let fields = [];

        Object.getOwnPropertyNames(file1).filter(e => e !== 'id').forEach((name) => {
            if(file1[name] !== file2[name]) {
                fields.push(name);
            }
        });

        return {
            file1: file1,
            file2: file2,
            fields: fields,
        };
    };


    /**
     * Find differences between two file arrays.
     * @param {File[]} array1 First array of files
     * @param {File[]} array2 Second array of files
     * 
     * @returns {FileArraysDiff | null} 
     */
    static diffFileArrays(array1, array2) {
        if(!(array1 instanceof Array) || !(array2 instanceof Array)) {
            return null;
        }

        let result = {
            filesWithoutPair1: [],
            filesWithoutPair2: [],
            differences: [],
        };

        let pairs = [];
        let diff;
        array1.forEach((file1) => {
            array2.forEach((file2) => {
                if(file1.url === file2.url) {
                    pairs.push({ file1: file1, file2: file2 });
                    diff = File.diffFiles(file1, file2);
                    if(diff.fields.length > 0) {
                        result.differences.push(diff);
                    }
                }
            });
        });


        array1.forEach((file) => {
            if(pairs.length === 0) {
                result.filesWithoutPair1.push(file);
                return;
            }

            for(let i = 0; i < pairs.length; i++) {
                if(pairs[i].file1 === file) {
                    break;
                } else if(pairs.length-1 === i) {
                    result.filesWithoutPair1.push(file);
                }
            }
        });

        array2.forEach((file) => {
            if(pairs.length === 0) {
                result.filesWithoutPair2.push(file);
                return;
            }

            for(let i = 0; i < pairs.length; i++) {
                if(pairs[i].file2 === file) {
                    break;
                } else if(pairs.length-1 === i) {
                    result.filesWithoutPair2.push(file);
                }
            }
        });

        return result;
    };


    /**
     * @param {any} object Parsed data object from 2ch API.
     * @param {number} listIndex The file's index in files list.
     * @returns {File} New File instance
     */
    static parseFrom2chJson(object, listIndex) {
        let index = object.fullname.lastIndexOf('.');
        if(index >= 0) object.fullname = object.fullname.slice(0, index);

        index = object.name.lastIndexOf('.');
        if(index >= 0) object.name = object.name.slice(0, index);

        
        return new File(listIndex,
                        `https://2ch.hk${object.path}`,
                        `https://2ch.hk${object.thumbnail}`, 
                        object.fullname,
                        object.name,
                        object.md5,
                        false);
    };


    /**
     * @param {string} board
     * @param {Object} object Parsed data object from 4chan API.
     * @param {number} listIndex The file's index in files list.
     * @returns {File} New File instance
     */
    static parseFrom4canJson(board, object, listIndex) {
        return new File(listIndex,
                        `https://i.4cdn.org/${board}/${object.tim}${object.ext}`,
                        `https://i.4cdn.org/${board}/${object.tim}s.jpg`,
                        object.filename, object.tim, object.md5, false);
    };
};


module.exports = File;