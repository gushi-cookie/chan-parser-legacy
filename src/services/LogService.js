const winston = require('winston');
const util = require('util');


/**
 * Class represents a winston logger.
 */
class LogService {

    /**
     * Create an instance of the class.
     * @param {string} level Winston's level.
     */
    constructor(level) {
        this.outputPath = process.env.OUTPUT_PATH;
        this.level = level;
        this.depth = 3;

        this.logger = winston.createLogger({
            level,
            transports: [
                new winston.transports.Console({ format: LogService._createPrettyFormat(true, this.depth) }),
                new winston.transports.File({
                    format: LogService._createPrettyFormat(false, this.depth),
                    filename: `${this.outputPath}/workflow.log`,
                }),
            ],
        }).child({pid: process.pid});
    };


    /**
     * Create combined formats of the pretty print style.
     * @param {boolean} colorize Should the formatter colorize info object.
     * @param {number} depth Number of times to recurse while formatting objects in info.message.
     * @returns {import('logform').Format}
     */
    static _createPrettyFormat = function(colorize, depth) {
        let formats = [
            winston.format.timestamp({ format: 'hh:mm:ss.SSS' }),
            winston.format.printf(info => {
                let level;
                let message;
                Object.getOwnPropertySymbols(info).forEach(s => {
                    if(s.description === 'level') level = info[s];
                    if(s.description === 'message') message = info[s];
                });

                let stack = info.stack ? `\n${info.stack}` : '';
                if(typeof info.message === 'object') info.message = '\n' + util.inspect(info.message, false, depth, colorize);
console.log(info);
                return `[${info.timestamp}] ${info.level} (${info.pid}): ${info.message}${stack}`;
            }),
        ];
        if(colorize) formats.unshift(winston.format.colorize());
        
        return winston.format.combine(...formats);
    };
};

module.exports = LogService;