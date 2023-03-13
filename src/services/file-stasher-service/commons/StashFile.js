const axios = require('axios');
const mime = require('mime-types');
const File = require('../../threads-observer-service/commons/File');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const StreamPromise = require('node:stream/promises');
const Stream = require('node:stream');

/**
 * Class represents a single file's data, and methods for working with fs and http, for the file.
 */
class StashFile {

    /**
     * Create an instance of the StashFile class.
     * @param {string} url Url for obtaining the file.
     * @param {string} fileName Name of the file.
     * @param {string} outputDir Path to a directory where to write the file. No '/' in the end.
     * @param {string} subdirName Additional directory in the outputDir path. Pass null if no subdir. No '/' in the name.
     */
    constructor(url, fileName, outputDir, subdirName) {
        if(outputDir[outputDir.length-1] === '/') {
            outputDir = outputDir.slice(0, outputDir.length-1);
        }

        if(subdirName !== null) {
            subdirName = subdirName.replace('/\//g', '');
        }


        /** @type {boolean}*/ this.isFetched = false;
        /** @type {string} */ this.fileExtension = null;
        /** @type {Buffer} */ this.buffer = null;
        /** @type {boolean}*/ this.notFound = false;

        /** @type {string} */ this.url = url;
        /** @type {string} */ this.fileName = fileName;
        /** @type {string} */ this.subdirName = subdirName;
        /** @type {string | null} */ this.outputDir = outputDir;
    };



    /**
     * Form path to an output directory of the file.
     * @param {boolean} includeFileName Should file name and extension be added to the end of the path.  
     * @returns {string | null} Path to the file or to the output directory.
     */
    formOutputPath(includeFileName) {
        let result;

        if(this.subdirName !== null) {
            result = `${this.outputDir}/${this.subdirName}`;
        } else {
            result = `${this.outputDir}`;
        }

        if(includeFileName) {
            if(this.fileExtension === null) return null;
            result += `/${this.fileName}.${this.fileExtension}`;
        }

        return result;
    };
    
    /**
     * Probe if the output path exists, and create a new one if no.
     */
    async checkOutputDir() {
        await fsp.mkdir(this.formOutputPath(false), {recursive: true});
    };

    /**
     * Delete the file if it exists in the output directory.
     * @returns {Promise.<boolean>}
     */
    async deleteFile() {
        try {
            await fsp.rm(this.formOutputPath(true));
            return true;
        } catch(error) {
            if(error.code !== 'ENOENT') throw error;
            return false;
        }
    };


    /**
     * Check if the file exists in the output directory.
     * @returns {Promise.<boolean>}
     */
    async checkFileExistence() {
        try {
            await fsp.stat(this.formOutputPath(true));
            return true;
        } catch(error) {
            if(error.code === 'ENOENT') {
                return false;
            } else {
                throw error;
            }
        }
    };


    /**
     * Write file from the buffer to the output directory.
     * @param {boolean} clearBuffer Should the buffer be set to null after successful writing the file.
     */
    async flush(clearBuffer) {
        await this.checkOutputDir();
        await StreamPromise.pipeline(Stream.Readable.from(this.buffer), fs.createWriteStream(this.formOutputPath(true)));

        if(clearBuffer) {
            this.buffer = null;
        }
    };


    /**
     * Fetch the file by the url and set it to the buffer.
     * Method also sets fileExtension, notFound and isFetched variables.
     * @returns {Promise.<number | undefined>} Undefined on success or 404 on not found.
     * @throws {AxiosError | ECONNRESET}
     */
    async fetchFile() {
        let res;
        try {
            res = await axios({url: this.url, responseType: 'stream', method: 'get'});
        } catch(error) {
            if(error.response && error.response.status === 404) {
                this.notFound = true;
                return 404;
            } else {
                throw error;
            }
        }

        if(typeof res.headers['content-type'] === 'string' && mime.extension(res.headers['content-type'])) {
            await new Promise((resolve, reject) => {
                let stream = res.data;
                let chunks = [];
                stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                stream.on('error', (error) => reject(error));
                stream.on('end', () => {
                    this.buffer = Buffer.concat(chunks);
                    resolve();
                });
            });
            
            this.fileExtension = mime.extension(res.headers['content-type']);
            this.isFetched = true;
        } else {
            let error = new Error('Content-Type header is not set or invalid.');
            error.response = res;
            throw error;
        }
    };


    /**
     * Make a StashFile instance from an observer File instance.
     * @param {File} file ThreadsObserverService's file.
     * @param {string} outputDir Path to an output directory.
     * @param {string} subdirName Set null if no subdir.
     * @returns {StashFile}
     */
    static makeFromObserverFile(file, outputDir, subdirName) {
        return new StashFile(file.url, file.cdnName, outputDir, subdirName);
    };
};

module.exports = StashFile;