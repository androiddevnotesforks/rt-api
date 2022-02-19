const RutrackerApi = require('../rutracker-api-master/index')
const cheerio = require('cheerio')
const { URLSearchParams } = require('url')
const logger = require('../logger').logger
const config = require('../config').config
const htmlToSDUIConverter = require('./htmlToSDUIConverter')


const rutracker = new RutrackerApi(config.HOST);
rutracker.login({ username: config.USERNAME, password: config.PASSWORD })

module.exports.search = async function (query, sort, order) {
    let searchResult
    try {
        searchResult = await rutracker.search({ query: query, sort: sort, order: order })
    } catch (e) {
        await refreshCookies()
        searchResult = await rutracker.search({ query: query, sort: sort, order: order })
    }
    return searchResult
}

module.exports.downloadTorrentFile = async function (id) {
    let result
    try {
        result = rutracker.download(id)
    } catch (e) { 
        await refreshCookies()
        result = rutracker.download(id)
    }
    return result
}

module.exports.getMagnetLink = async function (id) {
    let result
    try {
        result = rutracker.getMagnetLink(id)
    } catch (e) {
        await refreshCookies()
        result = rutracker.getMagnetLink(id)
    }
    return result
}

module.exports.getTorrentDescription = async function (id, SDUIVersion) {
    let html
    try {
        html = await rutracker.thread(id)
    } catch (e) {
        await refreshCookies()
        html = await rutracker.thread(id)
    }
    const $ = cheerio.load(html)
    const torrentStats = $('#t-tor-stats .borderless b')
    const formattedSize = torrentStats.eq(0).text()
    const timeAfterUpload = torrentStats.eq(1).text()
    const downloads = torrentStats.eq(2).text()
    let seeds = $('.seed b').text()
    if (seeds == '') {
        seeds = 0
    }
    let leeches = $('.leech b').text()
    if (leeches == '') {
        leeches = 0
    }
    const state = $('#tor-status-resp b').text()
    const threadUrl = new URLSearchParams($('#tr-menu a').last().attr('href'))
    const threadId = threadUrl.get('tracker.php?f')

    let SDUIData
    if (SDUIVersion == config.SDUI_VERSION) {
        SDUIData = await htmlToSDUIConverter.convert($('.post_body'))
    } else {
        SDUIData = null
    }

    return {
        SDUIData: SDUIData,
        formattedSize: formattedSize,
        timeAfterUpload: timeAfterUpload,
        downloads: downloads,
        seeds: seeds,
        leeches: leeches,
        state: state,
        threadId: threadId
    }
}

function refreshCookies() {
    logger.warn('refreshing cookies')
    return rutracker.login({ username: config.USERNAME, password: config.PASSWORD })
}