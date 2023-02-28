const express = require('express');
const App = require('./app/app');

class WebService {
    constructor() {
        this.app = new App(8080);
        this.app.startServer();
    };
};


module.exports = WebService;