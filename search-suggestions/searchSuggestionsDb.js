const mongoUtil = require("../mongoUtil")
const collection = "sugg"

module.exports.insertOne = async function (suggestion) {
    const db = mongoUtil.getDb()
    await db.collection(collection).insertOne(suggestion)
}

module.exports.updateOne = async function (suggestion) {
    const db = mongoUtil.getDb()
    await db.collection(collection).updateOne({ title: suggestion.title },
        {
            $set: {
                requests: suggestion.requests
            }
        })
}

module.exports.getByTitle = async function (title) {
    const db = mongoUtil.getDb()
    return await db.collection(collection).findOne({ title: title })
}

module.exports.findText = async function (query, limit) {
    const db = mongoUtil.getDb()
    const agg = await await db.collection(collection).aggregate([
        {
            $match: {
                $text: {
                    $search: query
                }
            }
        },
        {
            $sort: {
                score: {
                    $meta: 'textScore'
                }
            }
        },     
        {
            $limit: limit
        }
    ])
    return await agg.toArray()
}

module.exports.getCursor = async function () {
    const db = mongoUtil.getDb()
    return await db.collection(collection).find()
}