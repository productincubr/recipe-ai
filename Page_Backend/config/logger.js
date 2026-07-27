import winston from 'winston';

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

/**
 * Custom log formatting to output pretty-printed messages along with metadata.
 */
const customLogFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let formattedMessage = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    formattedMessage += ` ${JSON.stringify(metadata)}`;
  }
  return formattedMessage;
});

/**
 * Winston Logging Instance.
 * Logs colorized text to the console, and writes uncolorized text logs to files.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    customLogFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.uncolorize(),
        customLogFormat
      )
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.uncolorize(),
        customLogFormat
      )
    })
  ]
});

export default logger;
