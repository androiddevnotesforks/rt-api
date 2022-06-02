const MongoClient = require("mongodb").MongoClient
const config = require('../config').config
const collection = "sugg"

// приводим все рекомендации в бд к нижнему регистру и объединяем повторы

async function start() {
    const mongoClient = new MongoClient(config.MONGODB_CONNECTION_STRING, { useUnifiedTopology: true });
    await mongoClient.connect()
    const db = await mongoClient.db("rtapi")

    let cursor = await db.collection(collection).find()
    const count = await cursor.count()
    console.log(`found ${count} suggestions`)
    while (await cursor.hasNext()) {
        const sugg = await cursor.next()
        await db.collection(collection).updateOne({ _id: sugg._id },
            {
                $set: {
                    title: sugg.title.toLowerCase(),
                    tokens: sugg.tokens.toLowerCase()
                }
            })
    }

    cursor = await db.collection(collection).find()
    while (await cursor.hasNext()) {
        const sugg = await cursor.next()
        const suggArr = await db.collection(collection).find({ title: sugg.title }).toArray()
        
        if (suggArr.length > 1) {
            console.log(`found ${suggArr.length} copies of ${sugg.title}`)
            const mergedSugg = {
                title: sugg.title,
                tokens: sugg.tokens,
                requests: []
            }

            for (const suggArrEntry of suggArr) {
                for (const req of suggArrEntry.requests) {
                    mergedSugg.requests.push(req)
                }
                await db.collection(collection).deleteOne({ _id: suggArrEntry._id })
            }

            await db.collection(collection).insertOne(mergedSugg)
        }
    }
    await mongoClient.close()
}

start()