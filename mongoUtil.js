const MongoClient = require("mongodb").MongoClient
const config = require('./config').config

let mongoClient
let _db

module.exports = {
    connectToDb: async function (dbname) {
        mongoClient = new MongoClient(config.MONGODB_CONNECTION_STRING, { useUnifiedTopology: true });
        await mongoClient.connect()
        _db = await mongoClient.db(dbname)
    },

    getDb: function () {
        return _db
    },

    close: async function () {
        await mongoClient.close()
        _db = null
        mongoClient = null
    }
}