const axios = require('axios');
// const axios = require('axios').default;
// const axios = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Thread = require('./commons/Thread');
const ThreadCreateEvent = require('../../events/ThreadCreateEvent');
const ThreadDeleteEvent = require('../../events/ThreadDeleteEvent');
const CatalogThread = require('./commons/CatalogThread');
const EventEmitter = require('events');

module.exports = class ThreadsObserverService extends EventEmitter {
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

        this.board = 'b';
    };


    // Threads array interface
    getThread(number) {
        for(let i = 0; i < this.threads.length; i++) {
            if(this.threads[i].number === number) {
                return this.threads[i];
            }
        }
        return null;
    };


    // Api requests
    async fetchCatalog(board) {
        let url = ThreadsObserverService.formCatalogUrl(board);
        try {
            let res = await axios.get(url);
            if(res.headers['content-type'] === 'application/json') {
                let data = JSON.parse(res.data);
                return data.threads === null ? [] : data.threads;
            } else {
                // TO-DO Log
                return null;
            }
        } catch(error) {
            if(error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                return null;
            } else if(error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of http.ClientRequest

                // TO-DO Log
                return null;
            } else {
                // Something happened in setting up the request that triggered an Error

                // TO-DO Log
                return null;
            }
        }
    };

    async fetchThread(number) {
        let url = ThreadsObserverService.formThreadUrl(number);
        try {
            let res = await axios.get(url);
            
            if(res.headers['content-type'] === 'application/json') {
                return Thread.parseFrom2chJson(JSON.parse(res.data));
            } else {
                // TO-DO Log
                return null;
            }
        } catch(error) {
            if(error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                if(error.response.status === 404) {
                    return 404;
                } else {
                    // TO-DO Log
                    return null;
                }
            } else if(error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of http.ClientRequest

                // TO-DO Log
                return null;
            } else {
                // Something happened in setting up the request that triggered an Error

                // TO-DO Log
                return null;
            }
        }
    };


    // Observer controls
    startCatalogObserver() {
        let fn = async () => {
            let catalog = await this.fetchCatalog(this.board);
            if(catalog === null) {
                if(this.catalogObserverTimeout !== null) {
                    this.catalogObserverTimeout = setTimeout(fn, this.catalogObserverDelay);
                }
                return;
            }

            let catalogThreads = [];
            catalog.forEach((item) => {
                catalogThreads.push(CatalogThread.parseFrom2chJson(item));
            });

            let thread;
            catalogThreads.forEach((ct) => {
                thread = this.getThread(ct.number);

                if(thread !== null) {
                    thread.veiwsCount = ct.veiwsCount;
                    if(thread.lastPostTimestamp !== ct.lastPostTimestamp || thread.posts.length !== ct.postsCount) {
                        this.increaseThreadPriorityInQueue(thread);
                    }
                } else {
                    this.addThreadToCirculatingQueue(ct);
                }
            });

            let ct;
            this.threads.forEach((thread) => {
                for(let i = 0; i < catalogThreads.length - 1; i++) {
                    ct = catalogThreads[i];
                    if(ct.number !== thread.number && i === catalogThreads.length - 1) {
                        this.increaseThreadPriorityInQueue(thread);
                    }
                }
            });


            if(this.catalogObserverTimeout !== null) {
                this.catalogObserverTimeout = setTimeout(fn, this.catalogObserverDelay);
            }
        };
        this.catalogObserverTimeout = setTimeout(fn, this.catalogObserverDelay);
    };

    stopCatalogObserver() {
        clearTimeout(this.catalogObserverTimeout);
        this.catalogObserverTimeout = null;
    };


    // Threads updater queue controls
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

    increaseThreadPriorityInQueue(thread) {
        let fn = () => {
            let index = this.circulatingQueue.indexOf(thread);
            if(index < 0) {
                console.log('ALARM TO DO ERROR!!!');
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


    // Utils
    static formThreadUrl(threadNumber) {
        return `https://2ch.hk/b/res/${threadNumber}.json`;
    };

    static formCatalogUrl(board) {
        return `https://2ch.hk/${board}/catalog.json`;
    };
};