// Disable SSL certificate validation globally for local development environment
// Essential for bypassing antivirus/firewall HTTPS intercepts on Node.js native fetch/axios calls
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize and bind HTTP server listener
const server = app.listen(PORT, () => {
  logger.info(`Express application server successfully started on port ${PORT}`);
});

// Bind socket error listeners (e.g. PORT conflicts)
server.on('error', (error) => {
  logger.error('Http server encountered socket initialization error:', { error: error.message });
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already bound by another process. Release the port or edit PORT in .env.`);
  }
});

// Graceful process shutdown handler (SIGINT)
process.on('SIGINT', () => {
  logger.info('SIGINT termination signal received. Initiating graceful server shutdown...');
  server.close(() => {
    logger.info('HTTP server listener closed. Clean exit complete.');
    process.exit(0);
  });
});
