const mongoUtil = require("../mongoUtil")
const collection = "subscriptions"
const versionCollection = "subscriptionsVer"
const logger = require("../logger").logger

module.exports.insertOne = async function (feed) {
    const db = mongoUtil.getDb()
    await db.collection(collection).insertOne(feed)
}

module.exports.updateSubscribers = async function (feed) {
    const db = mongoUtil.getDb()
    await db.collection(collection).updateOne({ threadId: feed.threadId },
        {
            $set: {
                subscribers: feed.subscribers
            }
        })
}

module.exports.updateOne = async function (feed) {
    const db = mongoUtil.getDb()
    await db.collection(collection).updateOne({ threadId: feed.threadId },
        {
            $set: {
                title: feed.title,
                entries: feed.entries,
                lastUpdateTimestamp: feed.lastUpdateTimestamp,
                rootFeedId: feed.rootFeedId
            }
        })
}

module.exports.removeOne = async function (id) {
    const db = mongoUtil.getDb()
    await db.collection(collection).deleteOne({ threadId: id })
}

module.exports.getByThreadId = async function (id) {
    const db = mongoUtil.getDb()
    return await db.collection(collection).findOne({ threadId: id })
}

module.exports.getByThreadIds = async function (ids) {
    const db = mongoUtil.getDb()
    return await db.collection(collection).find({ id: { "$in": ids } }).toArray()
}

module.exports.getCursor = async function() {
    const db = mongoUtil.getDb()
    return await db.collection(collection).find()
}

module.exports.getCursorForFeedsWithSubscribers = async function () {
    const db = mongoUtil.getDb()
    const query = {
        subscribers: { $not: { $size: 0} }
    }
    return await db.collection(collection).find(query).batchSize(10)//without batch size cursor dies in ~50 min
}

module.exports.getVersion = async function () {
    const db = mongoUtil.getDb()
    let version = await db.collection(versionCollection).findOne({ _id: 0 })
    if (!version) {
       version = {
            _id: 0,
            version: 0,
            lastUpdate: Date.now()
       }
       await db.collection(versionCollection).insertOne(version)
       logger.info("version collection initialized")
    }
    return version
}

module.exports.updateVersion = async function (version) {
    const db = mongoUtil.getDb()
    await db.collection(versionCollection).updateOne({ _id: 0 },
        {
            $set: {
                version: version.version,
                lastUpdate: version.lastUpdate
            }
        })
}