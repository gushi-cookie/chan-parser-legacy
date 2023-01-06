module.exports = class File {
    constructor(url, thumbnailUrl, uploadName, cdnName, checkSum) {
        this.url = url;
        this.thumbnailUrl = thumbnailUrl;
        this.uploadName = uploadName;
        this.cdnName = cdnName;
        this.checkSum = checkSum;
    };

    static parseFrom2chJson(obj) {
        return new File(obj.path, obj.thumbnailUrl, obj.fullname, obj.name, obj.md5);
    };

    static parseFrom4canJson(obj) {
        // TO-DO
    };
}