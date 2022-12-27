const Parser = require("./lib/parser");
const PageProvider = require("./lib/page-provider");

class RutrackerApi {
    constructor(host) {
        this.parser = new Parser(host);
        this.pageProvider = new PageProvider(host);
    }

    login({ username, password }) {
        return this.pageProvider.login(username, password);
    }

    search({ query, sort, order, feed }) {
        return this.pageProvider
            .search({ query, sort, order, feed })
            .then(html => this.parser.parseSearch(html));
    }

    thread(id) {
        return this.pageProvider.thread(id)
    }

    download(id) {
        return this.pageProvider.torrentFile(id);
    }

    getMagnetLink(id) {
        return this.pageProvider
            .thread(id)
            .then(html => this.parser.parseMagnetLink(html));
    }
}

module.exports = RutrackerApi;
