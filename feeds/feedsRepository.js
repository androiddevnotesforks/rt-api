const db = require('./feedsDb')
const rssSource = require('./rssSource')
const config = require('../config').config
const logger = require('../logger').logger

module.exports.getRssFeed = async function (id) {
    const dbFeed = await db.getByThreadId(id)
    if (dbFeed == null) {
        throw `cannot find thread id ${id} in db`
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

module.exports.updateAllFeeds = async function(freshFeeds) {
    let isDbUpdated = false
    for (const freshFeed of freshFeeds) {
        const dbFeed = await db.getByThreadId(freshFeed.id)
        if (dbFeed == null) {
            await db.insertOne({
                threadId: freshFeed.id,
                title: freshFeed.title,
                rootFeedId: freshFeed.rootFeedId,
                entries: [],
                subscribers: [],
                lastUpdateTimestamp: Date.now()
            })
            isDbUpdated = true
            logger.debug(`added new feed ${freshFeed.title}`)
        } else if (freshFeed.title != dbFeed.title || freshFeed.rootFeedId != dbFeed.rootFeedId) {
            dbFeed.title = freshFeed.title
            dbFeed.rootFeedId = freshFeed.rootFeedId
            await db.updateOne(dbFeed)
            isDbUpdated = true
            logger.debug(`feed ${dbFeed.title} updated`)
        }
    }
    const cursor = await db.getCursor()
    while (await cursor.hasNext()) {
        const dbFeed = await cursor.next()
        const found = freshFeeds.find(freshFeed => freshFeed.id == dbFeed.threadId)
        if (!found) {
            await db.removeOne(dbFeed.threadId)
            isDbUpdated = true
            logger.debug(`feed ${dbFeed.title} deleted`)
        }
    }
    if (isDbUpdated) {
        const version = await db.getVersion()
        version.version++
        version.lastUpdate = Date.now()
        await db.updateVersion(version)
        logger.info(`feed db version updated, version number ${version.version}`)
    }
}