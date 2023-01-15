const axios = require('axios');
// const axios = require('axios').default;
// const axios = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Thread = require('./commons/Thread');
const ThreadCreateEvent = require('../../events/ThreadCreateEvent');
const ThreadDeleteEvent = require('../../events/ThreadDeleteEvent');
const CatalogThread = require('./commons/CatalogThread');
const EventEmitter = require('events');





/**
 * Class representing catalog and thread observers with event callbacks.
 */
class ThreadsObserverService extends EventEmitter {
    /**
     * Create an instance of the ThreadsObserverService class.
     */
    constructor() {
        this.threads = [];
        this.catalogObserverTimeout = null;
        this.catalogObserverDelay = 5000;

        this.circulatingQueue = [];
        this.circulatingQueue.locked = false;
        this.circulatingQueue.timer = null;
        this.circulatingQueue.stack = [];

        this.threadUpdaterTimeout = null;
        this.threadUpdaterDelay = 5000;

        this.imageBoard = '2ch';
        this.board = 'b';
    };



    // ########################
    // Thread storage interface
    // ########################

    /**
     * Search for a stored thread with same number.
     * @param {number} number 
     * @returns {Thread | null}
     */
    getThread(number) {
        for(let i = 0; i < this.threads.length; i++) {
            if(this.threads[i].number === number) {
                return this.threads[i];
            }
        }
        return null;
    };



    // ############
    // Api requests
    // ############

    /**
     * Form an url for requesting a thread.
     * @param {string} imageBoard
     * @param {string} board
     * @param {number} threadNumber 
     * @returns {string | null} String url
     */
    static formThreadUrl(imageBoard, board, threadNumber) {
        if(imageBoard === '4chan') {
            return `https://a.4cdn.org/${board}/thread/${threadNumber}.json`;
        } else if(imageBoard === '2ch') {
            return `https://2ch.hk/${board}/res/${threadNumber}.json`;
        } else {
            return null;
        }
    };


    /**
     * Form an url for requesting a catalog.
     * @param {string} imageBoard
     * @param {string} board 
     * @returns {string | null} String url
     */
    static formCatalogUrl(imageBoard, board) {
        if(imageBoard === '4chan') {
            return `https://a.4cdn.org/${board}/catalog.json`;
        } else if(imageBoard === '2ch') {
            return `https://2ch.hk/${board}/catalog.json`;
        } else {
            return null;
        }
    };


    /**
     * Request catalog threads for a specific board.
     * @param {string} imageBoard
     * @param {string} board 
     * @returns {Promise.<CatalogThread[] | number>} Catalog threads array or 404.
     * @throws {AxiosError | SyntaxError}
     */
    static async fetchCatalog(imageBoard, board) {
        let url = ThreadsObserverService.formCatalogUrl(imageBoard, board);

        let res;
        try {
            res = await axios.get(url);
        } catch(error) {
            if(error.response && error.response.status === 404) {
                return 404;
            } else {
                throw error;
            }
        }

        if(res.headers['content-type'] === 'application/json') {
            let data = JSON.parse(res.data);
            return CatalogThread.parseFromCatalogJson(imageBoard, board, data);
        } else {
            let error = new Error('Response content-type header is not set or not equal to application/json.');
            error.response = res;
            throw error;
        }
    };


    /**
     * Request for a specific thread.
     * @param {string} imageBoard
     * @param {string} board
     * @param {number} number 
     * @returns {Thread | number} Fetched thread or 404.
     * @throws {AxiosError | SyntaxError}
     */
    static async fetchThread(imageBoard, board, number) {
        let url = ThreadsObserverService.formThreadUrl(imageBoard, board, number);

        let res;
        try {
            res = await axios.get(url);
        } catch(error) {
            if(error.response && error.response.status === 404) {
                return 404;
            } else {
                throw error;
            }
        }

        if(res.headers['content-type'] === 'application/json') {
            let data = JSON.parse(res.data);
            return Thread.parseFromJson(imageBoard, board, data);
        } else {
            let error = new Error('Response content-type header is not set or not equal to application/json.');
            error.response = res;
            throw error;
        }
    };



    // #########################
    // Catalog observer controls
    // #########################

    startCatalogObserver() {
        let fetchErrorHandler = (error) => {
            // TO-DO Log error
        };

        let observeCatalog = async () => {
            /** @type {CatalogThread[]} */
            let catalog;
            try {
                catalog = await ThreadsObserverService.fetchCatalog(this.imageBoard, this.board);
            } catch(error) {
                fetchErrorHandler(error);
                return;
            }

            if(catalog === 404) {
                // TO-DO Log 404
                return;
            }

            // Search for new or modified threads.
            /** @type {Thread} */
            let thread;
            catalog.forEach((catalogThread) => {
                thread = this.getThread(catalogThread.number);

                if(thread === null) {
                    this.addThreadToCirculatingQueue(catalogThread);
                } else {
                    thread.viewsCount = catalogThread.viewsCount;
                    if(thread.lastActivity !== catalogThread.lastActivity || thread.posts.length !== catalogThread.postsCount) {
                        this.increaseThreadPriorityInQueue(thread);
                    }
                }
            });

            // Searching for probably deleted threads.
            /** @type {CatalogThread} */
            let catalogThread;
            this.threads.forEach((thread) => {
                for(let i = 0; i < catalog.length - 1; i++) {
                    catalogThread = catalog[i];
                    if(thread.number === catalogThread.number) {
                        break;
                    } else if(catalog.length - 1 === i) {
                        // Thread not found in the fetched catalog.
                        this.increaseThreadPriorityInQueue(thread);
                    }
                }
            });
        };

        let timer = async () => {
            await observeCatalog();

            if(this.catalogObserverTimeout !== null) {
                this.catalogObserverTimeout = setTimeout(fn, this.catalogObserverDelay);
            }
        };

        this.catalogObserverTimeout = setTimeout(timer, this.catalogObserverDelay);
    };

    stopCatalogObserver() {
        let timeout = this.catalogObserverTimeout;
        this.catalogObserverTimeout = null;
        clearTimeout(this.catalogObserverTimeout);
    };


    
    // ########################
    // Threads updater controls
    // ########################

    /**
     * Add thread to the circulating queue.
     * @param {CatalogThread | Thread} thread 
     */
    addThreadToCirculatingQueue(thread) {
        let fn = () => {
            this.circulatingQueue.unshift(thread);
        };

        if(this.circulatingQueue.locked) {
            this.circulatingQueue.stack.push(fn);
        } else {
            fn();
        }
    };


    /**
     * Replace a thread in the start of the circulating queue.
     * @param {Thread | CatalogThread} thread 
     */
    increaseThreadPriorityInQueue(thread) {
        let fn = () => {
            let index = this.circulatingQueue.indexOf(thread);
            if(index < 0) {
                // TO-DO Thread not found in queue.
                return;
            }

            this.circulatingQueue.splice(index, 1);
            this.circulatingQueue.unshift(thread);
        };

        if(this.circulatingQueue.locked) {
            this.circulatingQueue.stack.push(fn);
        } else {
            fn();
        }
    };

    lockCirculatingQueue() {
        let timer = () => {
            if(this.circulatingQueue.locked) {
                this.circulatingQueue.timer = setTimeout(timer, 500);
            } else {
                this.circulatingQueue.stack.forEach((fn) => { fn(); });
                this.circulatingQueue.timer = null;
                this.circulatingQueue.stack = [];
            }
        };

        this.circulatingQueue.locked = true;
        this.circulatingQueue.timer = setTimeout(timer, 500);
    };

    unlockCirculatingQueue() {
        this.circulatingQueue.locked = false;
    };


    startThreadUpdater() {
        let fn = async () => {
            if(this.circulatingQueue.length === 0) {
                if(this.threadUpdaterTimeout !== null) {
                    this.threadUpdaterTimeout = setTimeout(fn, this.threadUpdaterDelay);
                }
                return;
            }

            this.lockCirculatingQueue();

            let storedThread = this.circulatingQueue[0];
            let fetchedThread = await this.fetchThread(storedThread.number);

            if(storedThread instanceof Thread) {
                if(fetchedThread instanceof Thread) {
                    // check both threads

                    
                    let diff = Thread.diffThreads(storedThread, fetchedThread);
                    
                    
                    let pd = diff.postsDiff;
                    
                    
                    
                    
                    
                    
                    if(diff.fields.includes('')) {

                    }
                } else if(fetchedThread === 404) {
                    // thread deleted from board
                    this.circulatingQueue.splice(0, 1);
                    storedThread.isDeleted = true;
                    this.emit(ThreadDeleteEvent.name, new ThreadDeleteEvent(storedThread, storedThread.board));
                }
            }
            
            if(storedThread instanceof CatalogThread) {
                if(fetchedThread instanceof Thread) {
                    // new thread fetched
                    if(!this.getThread(fetchedThread.number)) {
                        this.threads.push(fetchedThread);
                        this.emit(ThreadCreateEvent.name, new ThreadCreateEvent(fetchedThread, fetchedThread.board));
                    } else {
                        // TO-DO -> Log collision
                    }
                } else if(fetchedThread === 404) {
                    // ct nof found. remove it from queue
                    this.circulatingQueue.splice(0, 1);
                }
            }

            this.unlockCirculatingQueue();

            if(this.threadUpdaterTimeout !== null) {
                this.threadUpdaterTimeout = setTimeout(fn, this.threadUpdaterDelay);
            }
        };
        this.threadUpdaterTimeout = setTimeout(fn, this.threadUpdaterDelay);
    };

    stopThreadUpdater() {
        clearTimeout(this.threadUpdaterTimeout);
        this.threadUpdaterTimeout = null;
    };
};


module.exports = ThreadsObserverService;