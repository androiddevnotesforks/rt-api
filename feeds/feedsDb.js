const mongoUtil = require("../mongoUtil")
const collection = "subscriptions"

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
                lastUpdateTimestamp: feed.lastUpdateTimestamp
            }
        })
}

module.exports.getByThreadId = async function (id) {
    const db = mongoUtil.getDb()
    return await db.collection(collection).findOne({ threadId: id })
}

module.exports.getByThreadIds = async function (ids) {
    const db = mongoUtil.getDb()
    return await db.collection(collection).find({ id: { "$in": ids } }).toArray()
}

module.exports.getCursorForFeedsWithSubscribers = async function () {
    const db = mongoUtil.getDb()
    const query = {
        subscribers: { $not: { $size: 0} }
    }
    return await db.collection(collection).find(query).batchSize(10)//without batch size cursor dies in ~50 min
}