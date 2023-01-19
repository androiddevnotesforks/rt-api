const express = require("express")
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoUtil = require("./mongoUtil")
const rtSource = require("./rutracker-source/rtSource")
const logger = require('./logger').logger
const config = require('./config').config
const feedsRepository = require('./feeds/feedsRepository')
const searchQueriesCache = require('./searchQueriesCache')
const searchSuggestions = require('./search-suggestions/searchSuggestions')
const schedule = require('node-schedule')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/rtapi/torrent/file", function (req, res) {
    const id = req.query.id
	downloadTorrentFile(id).then(stream => { stream.pipe(res) })
})

app.get("/rtapi/torrent/description", function (req, res) {
    const id = req.query.id
    const SDUIVersion = req.query.sduiversion
    getTorrentDescription(id, SDUIVersion).then(result => res.json(result))
})

async function searchTorrents(query, sort, order, feeds, startIndex, endIndex) {
    logger.verbose(`query: ${query}, sort: ${sort}, order: ${order}, feeds: ${feeds}, startIndex: ${startIndex}, endIndex: ${endIndex}`)

    let result
    const cachedResult = searchQueriesCache.lookInCache(query, sort, order, feeds)
    if (cachedResult != null) {
        logger.debug('using cached result')
        result = cachedResult
    } else {
        const torrents = await rtSource.search(query, sort, order, feeds)
        if (torrents.length != 0) {
            searchSuggestions.createNewSearchSuggestion(query)
        }
        searchQueriesCache.pushToCache(query, sort, order, feeds, torrents)
        result = { torrents: torrents, size: torrents.length }
    }
    return { torrents: result.torrents.slice(startIndex, endIndex), size: result.size }
}

async function downloadTorrentFile(id) {
    logger.verbose(`request for torrent file with id ${id}`)
    return await rtSource.downloadTorrentFile(id)
}

async function getMagnetLink(id) {
    logger.verbose(`request for magnet link for torrent with id ${id}`)
    return await rtSource.getMagnetLink(id)
}

async function getTorrentDescription(id, SDUIVersion) {
    logger.verbose(`request for description page for torrent with id ${id}`)
    return await rtSource.getTorrentDescription(id, SDUIVersion)
}

async function getRssItems(threadId) {
    const response = await feedsRepository.getRssFeed(threadId)
    logger.verbose(`request for feed ${response.title}`)
    return response
}

async function subscribeToFeed(threadId, deviceToken) {
    await feedsRepository.subscribeToFeed(threadId, deviceToken)
    logger.verbose(`user subcribed to feed ${threadId}, device token ${deviceToken}`)
}

async function unsubscribeFromFeed(threadId, deviceToken) {
    await feedsRepository.unsubscribeFromFeed(threadId, deviceToken)
    logger.verbose(`user unsubcribed from feed ${threadId}, device token ${deviceToken}`)
}

async function getSearchSuggestions(query) {
    return await searchSuggestions.findSuggestions(query)
}

async function getTrendingSearches() {
    return await searchSuggestions.getTrendingSuggestions()
}

const schema = buildSchema(`
type Torrent {
    id: String!
    category: String!,
    categoryId: String!,
    title: String!
    author: String!
    size: Float!
    seeds: Int!
    leeches: Int!
    downloads: Int!
    host: String!
    registered: Float!
    formattedSize: String!
    url: String!
    state: String!
}

type SearchResult {
    torrents: [Torrent!]!
    size: Int!
}

type RssChannel {
    title: String!
    threadId: String!
    entries: [RssChannelEntry!]!
}

type RssChannelEntry {
    title: String!
    link: String!
    updated: String!
    author: String!
    id: String!
}

type Query {
    search(query: String!, sort: String!, order: String!, feeds: [String!], startIndex: Int!, endIndex: Int!): SearchResult!
    magnetLink(id: String!): String!
    getRss(threadId: String!): RssChannel!
    getSearchSuggestions(query: String!): [String!]!
    getTrendingSearches: [String!]!
}

type Mutation {
    subscribeToRss(threadId: String!, token: String!): String!
    unsubscribeFromRss(threadId: String!, token: String!): String!
}
`)

const root = {
    search: ({ query, sort, order, feeds, startIndex, endIndex }) => {
        return searchTorrents(query, sort, order, feeds, startIndex, endIndex)
    },
    magnetLink: ({ id }) => {
        return getMagnetLink(id)
    },
    getRss: ({ threadId }) => {
        return getRssItems(threadId)
    },
    subscribeToRss: async ({ threadId, token }) => {
        await subscribeToFeed(threadId, token)
        return threadId
    },
    unsubscribeFromRss: async ({ threadId, token }) => {
        await unsubscribeFromFeed(threadId, token)
        return threadId
    },
    getSearchSuggestions: ({ query }) => {
        return getSearchSuggestions(query)
    },
    getTrendingSearches: () => {
        return getTrendingSearches()
    }
}

app.use('/rtapi/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: config.IS_GRAPHIQL_ENABLED,
    customFormatErrorFn: (error) => {      
        logger.error(`
            message: ${error.message},
            locations: ${error.locations},
            path: ${error.path},
            stack: ${error.stack ? error.stack.split('\n') : []}`
        )
        return {
            message: error.message,
            locations: error.locations,
            path: error.path
        }
    }
}));

(async function () {
    await mongoUtil.connectToDb("rtapi")
    app.listen(config.PORT, function () {
        logger.info("server started")
    })
})()

schedule.scheduleJob(config.TRENDS_UPDATE_START_CRON_STYLE, searchSuggestions.updateTrendingSuggestions)