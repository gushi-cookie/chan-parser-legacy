const blessed = require('blessed');

module.exports = class ScreenService {
    constructor(title = 'Unnamed') {
        this.title = title;

        this.screen = blessed.screen({
            smartCSR: true,
        });
        this.screen.title = this.title;

        this.screen.key(['escape', 'q', 'C-c'], (ch, key) => {
            return process.exit(0);
        });
    };

    startRender() {
        this.screen.render();
    };
};