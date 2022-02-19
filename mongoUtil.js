const MongoClient = require("mongodb").MongoClient

let mongoClient
let _db

module.exports = {
    connectToDb: async function (dbname) {
        mongoClient = new MongoClient("mongodb://127.0.0.1:27017/", { useUnifiedTopology: true });
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