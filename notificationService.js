const admin = require('firebase-admin')
const config = require('./config').config
const serviceAccount = require(`./${config.FIREBASE_ADMIN_SDK_CONFIG_FILE_NAME}`)
const mongoUtil = require("./mongoUtil")
const logger = require('./logger').logger
const db = require('./feeds/feedsDb')
const rssSource = require('./feeds/rssSource')

async function update() {
    const cursor = await db.getCursorForFeedsWithSubscribers()
    const count = await cursor.count()
    logger.debug(`update started, feeds with subscribers: ${count}, interval: ${config.RSS_UPDATE_INTERVAL / 1000} s`)

    while (await cursor.hasNext()) {
        const dbFeed = await cursor.next()
        try {
            const updatedFeed = await rssSource.getRssItems(dbFeed.threadId)
            const difference = updatedFeed.entries.filter(updatedEntry => !dbFeed.entries.some(dbFeedEntry => updatedEntry.id == dbFeedEntry.id))
            logger.debug(`found ${difference.length} new entries for feed ${dbFeed.title}`)
            dbFeed.title = updatedFeed.title
            dbFeed.entries = updatedFeed.entries
            dbFeed.lastUpdateTimestamp = Date.now()
            db.updateOne(dbFeed)
            if (difference.length != 0) { 
                for (const entry of difference) {
                    const message = {
                        data: {
                            title: entry.title,
                            feed: dbFeed.title,
                            id: entry.id,
                            threadId: dbFeed.threadId
                        },
                        android: {
                            priority: "high"
                        },
                        tokens: dbFeed.subscribers
                    }
                    admin.messaging().sendMulticast(message).then(response => {
                        if (response.failureCount > 0) {
                            const failedTokens = []
                            response.responses.forEach((resp, idx) => {
                                if (!resp.success) {
                                    failedTokens.push(dbFeed.subscribers[idx])
                                }
                            })
                            logger.debug(`failed tokens: ${failedTokens}`)
                            // todo нужно добавить логику обработки недействительных токенов, напр. если токен фейлится неск. раз подряд в течение
                            // определенного времени, то удаляем его. но сначала проверить, возможно у гугла есть свой механизм определения недействительных токенов, м.б. 
                            // запрос с токеном на какой-то эндпоинт. по первому фейлу, как написано ниже, удалять бессмысленно, т.к. возможных причин фейла много

                            //failedTokens.forEach((token) => {
                            //    const index = dbFeed.subscribers.indexOf(token)
                            //    if (index > -1) {
                            //        dbFeed.subscribers.splice(index, 1)
                            //    }
                            //})
                            //db.updateSubscribers(dbFeed)
                        }
                        logger.debug(`${response.successCount} message(s) were sent successfully`)
                    })
                }
            }
        } catch (e) {
            logger.error(e)
        }    
    }
    await new Promise(resolve => setTimeout(resolve, config.RSS_UPDATE_INTERVAL))//sleep
}

(async function () {
    await mongoUtil.connectToDb("rtapi")
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    })
    logger.info("notification service started")
    while (true) {
        await update()
    }
})()