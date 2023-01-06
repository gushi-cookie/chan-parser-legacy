const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Thread = require('./commons/Thread');
const CatalogThread = require('./commons/CatalogThread');
const EventEmitter = require('events');

module.exports = class ThreadsObserverService extends EventEmitter {
    constructor() {
        this.threads = [];
        this.observerIntervalId = null;
        this.observerIntervalDelay = 5000;

        this.updaterTimeoutId = null;
        this.updaterTimeoutDelay = 5000;

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
        let response = await fetch(url);
        let data = await response.json();

        return data.threads === null ? [] : data.threads;
    };

    async fetchThread(number) {
        let url = ThreadsObserverService.formThreadUrl(number);
        let response = await fetch(url);
        let data = await response.json();

        return Thread.parseFrom2chJson(data);
    };


    // Observer controls
    startObserve() {
        console.log('>>>>> Start Catalog Observer!');
        this.observerIntervalId = setInterval(async () => {
            let catalog = await this.fetchCatalog(this.board);

            let catalogThreads = [];
            catalog.forEach((item) => {
                catalogThreads.push(CatalogThread.parseFrom2chJson(item));
            });

            let thread;
            catalogThreads.forEach((ct) => {
                thread = this.getThread(ct.number);

                if(thread === null) {
                    
                }
            });
        }, this.observerIntervalDelay);
    };

    stopObserve() {
        clearInterval(this.observerIntervalId);
        this.observerIntervalId = null;
    };


    // Threads updater queue controls
    startThreadsUpdater() {
        console.log('>>>>> Start Threads Observer!');
    };

    stopThreadsUpdater() {

    };

    // Utils
    static formThreadUrl(threadNumber) {
        return `https://2ch.hk/b/res/${threadNumber}.json`;
    };

    static formCatalogUrl(board) {
        return `https://2ch.hk/${board}/catalog.json`;
    };
};