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