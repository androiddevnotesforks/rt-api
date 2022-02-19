const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs')
const { combine, timestamp, label, printf } = format;
const path = require("path")
const TelegramLogger = require('winston-telegram')
const config = require('./config').config

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logDir = 'log';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const dailyRotateInfoFileTransport = new transports.DailyRotateFile({
    filename: `${logDir}/%DATE%-rtapi-info.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    level: 'info'
});

const dailyRotateVerboseFileTransport = new transports.DailyRotateFile({
    filename: `${logDir}/%DATE%-rtapi-debug.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    level: 'verbose'
});

const console = new transports.Console({
    level: 'debug',
    format: format.colorize({ all: true })
})

const telegramBot = new TelegramLogger({
    token: config.TELEGRAM_BOT_TOKEN,
    chatId: config.TELEGRAM_CHAT_ID,
    level: 'error',
    batchingDelay: 1000
})

const logger = createLogger({
    format: combine(
        label({ label: path.basename(process.mainModule.filename) }),
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        myFormat
    ),
    transports: [
        console,
        dailyRotateInfoFileTransport,
        dailyRotateVerboseFileTransport,
        telegramBot
    ],
    exceptionHandlers: [
        console,
        dailyRotateInfoFileTransport,
        dailyRotateVerboseFileTransport,
        telegramBot
    ],
    rejectionHandlers: [
        console,
        dailyRotateInfoFileTransport,
        dailyRotateVerboseFileTransport,
        telegramBot
    ]
});

module.exports.logger = logger