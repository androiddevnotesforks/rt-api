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

const dailyRotateDebugFileTransport = new transports.DailyRotateFile({
    filename: `${logDir}/%DATE%-rtapi-debug.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    level: 'debug'
});

const dailyRotateVerboseFileTransport = new transports.DailyRotateFile({
    filename: `${logDir}/%DATE%-rtapi-verbose.log`,
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
    level: 'info',
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
        dailyRotateDebugFileTransport,
        dailyRotateVerboseFileTransport,
        telegramBot
    ],
    exceptionHandlers: [
        console,
        dailyRotateDebugFileTransport,
        dailyRotateVerboseFileTransport,
        telegramBot
    ],
    rejectionHandlers: [
        console,
        dailyRotateDebugFileTransport,
        dailyRotateVerboseFileTransport,
        telegramBot
    ]
});

module.exports.logger = logger