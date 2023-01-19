const config = require('./config').config
const _ = require('lodash')

let searchQueriesCache = []

module.exports.lookInCache = function (query, sort, order, feeds) {
    const updatedCache = []
    let result = null
    //looking for cached query and clearing old cache in one loop
    for (const value of searchQueriesCache) {
        if (Date.now() - value.createdAt < config.SEARCH_QUERIES_CACHING_TIME) {
            updatedCache.push(value)
            if (value.query == query &&
                value.sort == sort &&
                value.order == order &&
                _.isEqual(value.feeds, feeds)
            ) {
                result = { torrents: value.torrents, size: value.torrents.length }
            }
        }
    }
    searchQueriesCache = updatedCache
    return result
}

module.exports.pushToCache = function (query, sort, order, feeds, torrents) {
    searchQueriesCache.push({ query: query, sort: sort, order: order, feeds: feeds, torrents: torrents, createdAt: Date.now() })
}