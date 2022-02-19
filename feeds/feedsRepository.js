const db = require('./feedsDb')
const rssSource = require('./rssSource')
const config = require('../config').config
const logger = require('../logger').logger

module.exports.getRssFeed = async function (id) {
    const dbFeed = await db.getByThreadId(id)
    if (dbFeed == null) {
        const feed = await rssSource.getRssItems(id)
        await db.insertOne({
            ...feed,
            subscribers: [],//idk how mongo handles Set(), so using array here
            lastUpdateTimestamp: Date.now()
        })
        logger.debug(`created new feed: ${feed.title}`)
        return feed
    }
    if (Date.now() - dbFeed.lastUpdateTimestamp > config.RSS_UPDATE_TIMEOUT) {
        const feed = await rssSource.getRssItems(id)
        return feed
    }
    logger.debug(`timeout hasn't passed`)
    return { threadId: dbFeed.threadId, title: dbFeed.title, entries: dbFeed.entries }
}

module.exports.subscribeToFeed = async function (id, deviceToken) {
    const feed = await db.getByThreadId(id)
    if (!feed.subscribers.includes(deviceToken)) {
        feed.subscribers.push(deviceToken)
        await db.updateSubscribers(feed)
    } else {
        logger.debug('user already subscribed')
    }
}

module.exports.unsubscribeFromFeed = async function (id, deviceToken) {
    const feed = await db.getByThreadId(id)
    const index = feed.subscribers.indexOf(deviceToken)
    if (index > -1) {
        feed.subscribers.splice(index, 1)
        await db.updateSubscribers(feed)
    } else {
        logger.debug('user already unsubscribed')
    }
}