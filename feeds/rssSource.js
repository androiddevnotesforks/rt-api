const Parser = require('rss-parser')
const { URL } = require("url");

const parser = new Parser()

module.exports.getRssItems = async function (id) {
    const url = `http://feed.rutracker.cc/atom/f/${id}.atom`
    const feed = await parser.parseURL(url)
    const entries = feed.items.map(entry => {
        const url = new URL(entry.link)
        const id = url.searchParams.get('t')
        return {
            title: entry.title,
            link: entry.link,
            updated: entry.pubDate,
            author: entry.author,
            id: id
        }
    })
    return { threadId: id, title: feed.title, entries: entries }
}