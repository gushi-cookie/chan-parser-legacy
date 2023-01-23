const axios = require('axios');
const mime = require('mime-types');
const File = require('../../threads-observer-service/commons/File');
const fs = require('fs').promises;
const fsSync = require('fs');
const StreamPromises = require('node:stream/promises');

class StashFile {

    /**
     * 
     * @param {string} url 
     * @param {string} fileName 
     * @param {string} outputDir 
     * @param {string} subdirName pass null if no subdir.
     */
    constructor(url, fileName, outputDir, subdirName) {
        if(outputDir[outputDir.length-1] === '/') {
            outputDir = outputDir.slice(0, outputDir.length-1);
        }

        this.downloaded = false;
        this.buffer = null;
        this.fileExtension = null;

        this.url = url;
        this.fileName = fileName;
        this.outputDir = outputDir;
        this.subdirName = subdirName;
    };


    /**
     * 
     * @returns {string} path
     */
    formFilePath() {
        if(this.subdirName !== null) {
            return `${this.outputDir}/${this.subdirName}/${this.fileName}.${this.fileExtension}`;
        } else {
            return `${this.outputDir}/${this.fileName}.${this.fileExtension}`;
        }
    };
    

    /**
     * Delete the file if it exists.
     */
    async deleteFile() {
        try {
            await fs.rm(this.formFilePath());
        } catch(error) {
            if(error.code !== 'ENOENT') {
                throw error;
            }
        }
    };


    /**
     * Check if file exists in the file path.
     */
    async exist() {
        try {
            await fs.stat(this.formFilePath);
            return true;
        } catch(error) {
            if(error.code === 'ENOENT') {
                return false;
            } else {
                throw error;
            }
        }
    };


    async downloadFile() {
        let res;
        try {
            res = await axios({url: this.url, responseType: 'stream', method: 'get'});
        } catch(error) {
            if(error.response && error.response.status === 404) {
                return 404;
            } else {
                throw error;
            }
        }

        if(typeof res.headers['content-type'] === 'string' && mime.extension(res.headers['content-type'])) {
            this.buffer = res.data;
            this.fileExtension = mime.extension(res.headers['content-type']);
            this.downloaded = true;
        } else {
            let error = new Error('Content-Type header is not set or invalid.');
            error.response = res;
            throw error;
        }
    };


    async flush(clearBuffer) {
        try {
            await StreamPromises.pipeline(this.buffer, fsSync.createWriteStream(this.formFilePath()));
        } catch(error) {
            throw error;
        }
        if(clearBuffer) {
            this.buffer = null;
        }
    };


    /**
     * Make StashFile instances from the File instance.
     * @param {File} file 
     * @param {string} outputDir
     * @param {string} subdirName pass null if no subdir.
     * @returns {Object} object with two fields: file, thumbnail.
     */
    static makeFromFile(file, outputDir, subdirName) {
        return {
            file: new StashFile(file.url, file.cdnName, outputDir, subdirName),
            thumbnail: new StashFile(file.thumbnailUrl, file.cdnName + '_thumbnail', outputDir, subdirName),
        };
    };
};

module.exports = StashFile;