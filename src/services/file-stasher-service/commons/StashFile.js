const axios = require('axios');
const mime = require('mime-types');
const File = require('../../threads-observer-service/commons/File');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const StreamPromise = require('node:stream/promises');
const Stream = require('node:stream');

/**
 * This class represents a single file with data and functional to download the file, store it in the programm and write it in the file system.
 */
class StashFile {

    /**
     * Create an instance of the StashFile class.
     * @param {string} url http(s) address to the file.
     * @param {string} fileName the name of the file.
     * @param {string} outputDir path to a dir where to write the file. No '/' in the end.
     * @param {string} subdirName additional directory in the outputDir path. Pass null if no subdir. No '/' in the name.
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
        /** @type {Stream} */ this.buffer = null;
        /** @type {boolean}*/ this.notFound = false;

        /** @type {string} */ this.url = url;
        /** @type {string} */ this.fileName = fileName;
        /** @type {string} */ this.subdirName = subdirName;
        /** @type {string | null} */ this.outputDir = outputDir;
    };



    /**
     * Form path to the file from the location data.
     * @param {boolean} forFile
     * @returns {string | null} path to the file.
     */
    formOutputPath(forFile) {
        let result;

        if(this.subdirName !== null) {
            result = `${this.outputDir}/${this.subdirName}`;
        } else {
            result = `${this.outputDir}`;
        }

        if(forFile) {
            if(this.fileExtension === null) return null;
            result += `/${this.fileName}.${this.fileExtension}`;
        }

        return result;
    };
    
    /**
     * 
     */
    async checkOutputDir() {
        await fsp.mkdir(this.formOutputPath(false), {recursive: true});
    };

    /**
     * Delete the file if it exists.
     * @returns {boolean}
     */
    async deleteFile() {
        try {
            await fsp.rm(this.formOutputPath(true));
        } catch(error) {
            if(error.code !== 'ENOENT') {
                throw error;
            }
        }
    };


    /**
     * Check if the file exists.
     */
    async checkFileExistence() {
        try {
            await fs.stat(this.formOutputPath(true));
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
     * @param {boolean} clearBuffer clear buffer after successful writing the file.
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
     * 
     * Note that Axios doesn't fire error if connection is reset (forcibly closed by a peer; in some cases).
     * This means that a fetched stream from response may be broken and, if try to read it, ECONNRESET error may to occur.
     * @returns {Promise.<number | void>} void on success or 404.
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
     * Make two StashFile objects (file and thumbnail) from a File instance.
     * @param {File} file ThreadsObserverService file.
     * @param {string} outputDir path to an output directory.
     * @param {string} subdirName pass null if no subdir.
     * @returns {import('../FileStasherService').StashPair} object with two fields: file, thumbnail.
     */
    static makeFromFile(file, outputDir, subdirName) {
        return {
            file: new StashFile(file.url, file.cdnName, outputDir, subdirName),
            thumbnail: new StashFile(file.thumbnailUrl, file.cdnName + '_thumbnail', outputDir, subdirName),
        };
    };
};

module.exports = StashFile;