module.exports = class File {
    constructor(url, thumbnailUrl, uploadName, cdnName, checkSum) {
        this.url = url;
        this.thumbnailUrl = thumbnailUrl;
        this.uploadName = uploadName;
        this.cdnName = cdnName;
        this.checkSum = checkSum;
    };

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

    static diffFiles(file1, file2) {
        if(!(file1 instanceof File) || !(file2 instanceof File)) {
            return null;
        } else if(file1 === file2) {
            return [];
        }

        let fields = [];

        if(file1.url !== file2.url) {
            fields.push('url');
        }
        if(file1.thumbnailUrl !== file2.thumbnailUrl) {
            fields.push('thumbnailUrl');
        }
        if(file1.uploadName !== file2.uploadName) {
            fields.push('uploadName');
        }
        if(file1.cdnName !== file2.cdnName) {
            fields.push('cdnName');
        }
        if(file1.checkSum !== file2.checkSum) {
            fields.push('checkSum');
        }

        return fields;
    };

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
        let diffFields;
        array1.forEach((file1) => {
            array2.forEach((file2) => {
                if(file1.url === file2.url) {
                    pairs.push({ file1: file1, file2: file2 });
                    diffFields = File.diffFiles(file1, file2);
                    if(diffFields.length > 0) {
                        result.differences.push({
                            file1: file1,
                            file2: file2,
                            fields: diffFields,
                        });
                    }
                }
            });
        });


        array1.forEach((file) => {
            pairs.forEach((pair, index) => {
                if(pairs.length-1 === index && file !== pair.file1) {
                    result.filesWithoutPair1.push(file);
                }
            });
        });

        array2.forEach((file) => {
            pairs.forEach((pair, index) => {
                if(pairs.length-1 === index && file !== pair.file2) {
                    result.filesWithoutPair2.push(file);
                }
            });
        });

        return result;
    };


    static parseFrom2chJson(obj) {
        return new File(obj.path, obj.thumbnailUrl, obj.fullname, obj.name, obj.md5);
    };

    static parseFrom4canJson(obj) {
        // TO-DO
    };
}